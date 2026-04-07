import { IJupyterGISClientState, IJupyterGISModel } from '@jupytergis/schema';
import * as React from 'react';

interface IUseRightPanelOptionsResult {
  storyMapPresentationMode: boolean;
  editorMode: boolean;
  showEditor: boolean;
  storyPanelTitle: string;
  toggleEditor: () => void;
}

/**
 * Manages story map presentation mode and editor mode for a right-side panel.
 *
 * Fires optional callbacks when tab-switching events occur, so the caller can
 * manage its own curTab across any set of tabs (right panel only, or merged).
 */
export function useRightPanelOptions(
  model: IJupyterGISModel,
  opts?: {
    onPresentationModeEnabled?: () => void;
    onIdentifyFeatures?: () => void;
  },
): IUseRightPanelOptionsResult {
  const [editorMode, setEditorMode] = React.useState(true);
  const [storyMapPresentationMode, setStoryMapPresentationMode] =
    React.useState(model.getOptions().storyMapPresentationMode ?? false);

  // Keep refs fresh to avoid stale closures in the effect below
  const onPresentationModeEnabledRef = React.useRef(
    opts?.onPresentationModeEnabled,
  );
  const onIdentifyFeaturesRef = React.useRef(opts?.onIdentifyFeatures);
  React.useEffect(() => {
    onPresentationModeEnabledRef.current = opts?.onPresentationModeEnabled;
    onIdentifyFeaturesRef.current = opts?.onIdentifyFeatures;
  });

  React.useEffect(() => {
    const onOptionsChanged = () => {
      const { storyMapPresentationMode } = model.getOptions();
      setStoryMapPresentationMode(storyMapPresentationMode ?? false);
      if (storyMapPresentationMode) {
        onPresentationModeEnabledRef.current?.();
      }
    };
    let currentlyIdentifiedFeatures: any = undefined;
    const onAwarenessChanged = (
      _: IJupyterGISModel,
      clients: Map<number, IJupyterGISClientState>,
    ) => {
      const clientId = model.getClientId();
      const localState = clientId ? clients.get(clientId) : null;

      if (
        localState &&
        localState.identifiedFeatures?.value &&
        localState.identifiedFeatures.value !== currentlyIdentifiedFeatures
      ) {
        currentlyIdentifiedFeatures = localState.identifiedFeatures.value;
        onIdentifyFeaturesRef.current?.();
      }
    };

    model.sharedOptionsChanged.connect(onOptionsChanged);
    model.clientStateChanged.connect(onAwarenessChanged);

    return () => {
      model.sharedOptionsChanged.disconnect(onOptionsChanged);
      model.clientStateChanged.disconnect(onAwarenessChanged);
    };
  }, [model]);

  const showEditor = !storyMapPresentationMode && editorMode;

  const storyPanelTitle = storyMapPresentationMode
    ? 'Story Map'
    : editorMode
      ? 'Story Editor'
      : 'Story Map';

  const toggleEditor = () => {
    setEditorMode(prev => !prev);
  };

  return {
    storyMapPresentationMode,
    editorMode,
    showEditor,
    storyPanelTitle,
    toggleEditor,
  };
}
