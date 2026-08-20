import ArtifactIcon from '../assets/icons/kg-wand.svg?react';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {$isArtifactNode} from './ArtifactNode';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export function ArtifactNodeComponent({artifactVersion, description, html, id, nodeKey, title}) {
    const [editor] = useLexicalComposerContext();
    const {cardConfig, onError} = React.useContext(KoenigComposerContext);

    const openArtifact = async (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!cardConfig.openArtifact) {
            return;
        }

        try {
            const updated = await cardConfig.openArtifact({
                nodeKey,
                artifact: {artifactVersion, description, html, id, title}
            });

            if (!updated) {
                return;
            }

            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                if (!$isArtifactNode(node)) {
                    return;
                }

                node.artifactVersion = updated.artifactVersion;
                node.description = updated.description;
                node.html = updated.html;
                node.id = updated.id;
                node.title = updated.title;
            });
        } catch (error) {
            onError?.(error instanceof Error ? error : new Error('Could not open Artifact Builder'));
        }
    };

    if (!html) {
        return (
            <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-grey-300 bg-grey-50 p-8 text-center dark:border-grey-800 dark:bg-grey-950">
                <ArtifactIcon aria-hidden="true" className="size-7 text-grey-700 dark:text-grey-300" />
                <div>
                    <div className="font-sans text-lg font-semibold text-black dark:text-white">Create an interactive embed</div>
                    <div className="mt-1 font-sans text-sm text-grey-700 dark:text-grey-400">Describe what you want to build and refine it in Builder.</div>
                </div>
                <button
                    className="rounded-md bg-black px-4 py-2 font-sans text-sm font-semibold text-white hover:bg-grey-800 dark:bg-white dark:text-black dark:hover:bg-grey-200"
                    data-kg-allow-clickthrough="true"
                    type="button"
                    onClick={openArtifact}
                >
                    Create artifact
                </button>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-md border border-grey-300 bg-white dark:border-grey-800 dark:bg-grey-950">
            <iframe
                className="pointer-events-none block h-64 w-full border-0 bg-white"
                sandbox="allow-forms allow-scripts"
                srcDoc={html}
                title={title || 'Interactive embed'}
            />
            <div className="flex items-center justify-between gap-4 border-t border-grey-300 px-4 py-3 font-sans dark:border-grey-800">
                <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-black dark:text-white">{title}</div>
                    {description && <div className="truncate text-xs text-grey-700 dark:text-grey-400">{description}</div>}
                </div>
                <button
                    className="shrink-0 rounded-md border border-grey-300 bg-white px-3 py-1.5 text-sm font-semibold text-black hover:bg-grey-100 dark:border-grey-700 dark:bg-grey-950 dark:text-white dark:hover:bg-grey-900"
                    data-kg-allow-clickthrough="true"
                    type="button"
                    onClick={openArtifact}
                >
                    Edit
                </button>
            </div>
        </div>
    );
}
