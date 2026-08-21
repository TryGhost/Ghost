import {
    MUTATION_TYPE_INSERT_CHILD,
    MUTATION_TYPE_REMOVE_CHILD,
    MUTATION_TYPE_UPDATE_TEXT,
    ROOT_ID,
    type RemoteConnection,
    type RemoteMutationRecord
} from '@remote-dom/core';
import {
    connectRemoteNode,
    disconnectRemoteNode,
    remoteId,
    serializeRemoteNode,
    setRemoteId
} from '@remote-dom/core/elements';

/**
 * Mirrors a DOM subtree to a remote connection, replacing remote-dom's
 * `RemoteMutationObserver`.
 *
 * The upstream observer encodes removals as `[REMOVE_CHILD, parent, index]`
 * with the index derived from `record.previousSibling`'s position in the
 * *final* DOM — but MutationObserver callbacks run after all mutations have
 * settled, so for replaced subtrees (the insert-then-remove pattern UI
 * frameworks produce on conditional re-renders) those positions are wrong and
 * stale nodes survive on the host.
 *
 * This mirror instead keeps a shadow view of the child list the host
 * currently believes each parent has (updated as mutations are emitted), and
 * reconciles each mutated parent's final DOM state against that view. Indices
 * are therefore always computed against the receiver's actual state.
 *
 * Property, attribute, and event-listener updates are not handled here: gh-*
 * elements are RemoteElements, whose setters sync those synchronously through
 * their own connection. Text mutations must be observed (`Text.data` writes
 * are not hooked in a real DOM), as must structure.
 */
export class GhostMutationMirror {
    private readonly connection: RemoteConnection;
    private readonly observer: MutationObserver;
    private root: Node | null = null;
    /** Remote ids of every node the host knows about. */
    private readonly knownIds = new Set<string>();
    /** parent remote id → ordered child remote ids, as the host sees them. */
    private readonly childViews = new Map<string, string[]>();

    constructor(connection: RemoteConnection) {
        this.connection = connection;
        this.observer = new MutationObserver(records => this.flush(records));
    }

    observe(root: Node): void {
        if (this.root) {
            throw new Error('GhostMutationMirror can only observe one root');
        }
        setRemoteId(root, ROOT_ID);
        this.root = root;
        this.knownIds.add(ROOT_ID);
        this.childViews.set(ROOT_ID, []);

        const mutations: RemoteMutationRecord[] = [];
        this.reconcile(root, mutations);
        if (mutations.length > 0) {
            this.connection.mutate(mutations);
        }

        this.observer.observe(root, {
            subtree: true,
            childList: true,
            characterData: true
        });
    }

    disconnect(): void {
        this.observer.disconnect();
        this.root = null;
        this.knownIds.clear();
        this.childViews.clear();
    }

    private flush(records: MutationRecord[]): void {
        const root = this.root;
        if (!root) {
            return;
        }

        const mutations: RemoteMutationRecord[] = [];
        const reconciled = new Set<Node>();
        /** Subtrees serialized wholesale this flush — their internals are already final. */
        const serializedRoots: Node[] = [];
        const textUpdates: Text[] = [];
        const removedNodes: Node[] = [];

        for (const record of records) {
            if (record.type === 'characterData') {
                if (record.target instanceof Text) {
                    textUpdates.push(record.target);
                }
                continue;
            }
            if (record.type !== 'childList') {
                continue;
            }

            record.removedNodes.forEach(node => removedNodes.push(node));

            const parent = record.target;
            if (reconciled.has(parent)) {
                continue;
            }
            reconciled.add(parent);

            // Skip parents the host cannot know about: nodes serialized
            // wholesale this flush (their final state is already included),
            // and nodes that were never connected to the host tree.
            if (serializedRoots.some(serialized => serialized !== parent && serialized.contains(parent))) {
                continue;
            }
            if (!this.knownIds.has(remoteId(parent))) {
                continue;
            }

            this.reconcile(parent, mutations, serializedRoots);
        }

        // Text updates last, so nodes inserted this flush exist on the host.
        for (const text of textUpdates) {
            const id = remoteId(text);
            if (this.knownIds.has(id)) {
                mutations.push([MUTATION_TYPE_UPDATE_TEXT, id, text.data]);
            }
        }

        // Forget subtrees that ended up outside the observed tree.
        for (const node of removedNodes) {
            if (!root.contains(node)) {
                disconnectRemoteNode(node);
                this.forgetSubtree(node);
            }
        }

        if (mutations.length > 0) {
            this.connection.mutate(mutations);
        }
    }

    private reconcile(parent: Node, mutations: RemoteMutationRecord[], serializedRoots: Node[] = []): void {
        const parentId = remoteId(parent);
        const view = this.childViews.get(parentId) ?? [];
        const actualNodes = Array.from(parent.childNodes);
        const actualIds = actualNodes.map(node => remoteId(node));
        const actualIdSet = new Set(actualIds);

        // Remove children the host has that are no longer present.
        for (let index = view.length - 1; index >= 0; index--) {
            if (!actualIdSet.has(view[index])) {
                mutations.push([MUTATION_TYPE_REMOVE_CHILD, parentId, index]);
                this.knownIds.delete(view[index]);
                view.splice(index, 1);
            }
        }

        // Insert (or re-position) children until the view matches the DOM.
        for (let index = 0; index < actualNodes.length; index++) {
            const id = actualIds[index];
            if (view[index] === id) {
                continue;
            }

            const existingIndex = view.indexOf(id);
            if (existingIndex !== -1) {
                // Moved within this parent: detach from the old position and
                // re-insert serialized. The host subtree is rebuilt — an
                // acceptable cost for the rare keyed-reorder case.
                mutations.push([MUTATION_TYPE_REMOVE_CHILD, parentId, existingIndex]);
                view.splice(existingIndex, 1);
            }

            const node = actualNodes[index];
            connectRemoteNode(node, this.connection);
            mutations.push([MUTATION_TYPE_INSERT_CHILD, parentId, serializeRemoteNode(node), index]);
            view.splice(index, 0, id);
            serializedRoots.push(node);
            this.registerSubtree(node);
        }

        this.childViews.set(parentId, view);
    }

    /** Records host knowledge of a serialized subtree (ids + child views). */
    private registerSubtree(node: Node): void {
        this.knownIds.add(remoteId(node));
        if (node.childNodes.length > 0) {
            this.childViews.set(remoteId(node), Array.from(node.childNodes).map(child => remoteId(child)));
            node.childNodes.forEach(child => this.registerSubtree(child));
        }
    }

    private forgetSubtree(node: Node): void {
        const id = remoteId(node);
        this.knownIds.delete(id);
        this.childViews.delete(id);
        node.childNodes.forEach(child => this.forgetSubtree(child));
    }
}
