import { CodeEditor } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';
import type { PostType } from '@/editor/card-config';
import type { EditorSessionHandle } from '@/editor/session/use-editor-session';
import { SettingsSubview } from './settings-subview';

// A binding that returns true prevents the event's default, which the pane
// reads as answered. Arm tab-focus mode for the 2s @codemirror/view does.
const TAB_FOCUS_ESCAPE = () =>
  import('@uiw/react-codemirror').then(({ Prec, keymap }) =>
    Prec.lowest(
      keymap.of([
        {
          key: 'Escape',
          run: (view) => {
            view.setTabFocusMode(2_000);
            return true;
          },
        },
      ]),
    ),
  );

// Loaded on demand so CodeMirror stays out of the editor's main bundle.
const EDITOR_EXTENSIONS = [
  () => import('@codemirror/lang-html').then((module) => module.html()),
  TAB_FOCUS_ESCAPE,
];

const EDITOR_HEIGHT = '240px';

function EditorLabel({ text, helper }: { text: string; helper: string }) {
  return (
    <>
      {text} <code className="ml-1 font-normal">{helper}</code>
    </>
  );
}

export interface CodeInjectionSectionProps {
  session: EditorSessionHandle;
  postType: PostType;
}

/**
 * The header and footer code this post injects into the page it renders on,
 * beside whatever the site already injects.
 */
export function CodeInjectionSection({ session, postType }: CodeInjectionSectionProps) {
  const name = postType === 'page' ? 'Page' : 'Post';

  return (
    <SettingsSubview
      closeLabel="Close code injection panel"
      icon={<LucideIcon.Code />}
      id="code-injection"
      label="Code injection"
      title="Code injection"
      wide
    >
      <CodeEditor
        extensions={EDITOR_EXTENSIONS}
        height={EDITOR_HEIGHT}
        title={<EditorLabel helper="{{ghost_head}}" text={`${name} header`} />}
        value={session.settings.codeinjection_head ?? ''}
        onBlur={session.commitSettings}
        // A field cleared back to empty is stored as no value, as the excerpt is.
        onChange={(value) => session.stageSettings({ codeinjection_head: value || null })}
      />
      <CodeEditor
        extensions={EDITOR_EXTENSIONS}
        height={EDITOR_HEIGHT}
        title={<EditorLabel helper="{{ghost_foot}}" text={`${name} footer`} />}
        value={session.settings.codeinjection_foot ?? ''}
        onBlur={session.commitSettings}
        onChange={(value) => session.stageSettings({ codeinjection_foot: value || null })}
      />
    </SettingsSubview>
  );
}
