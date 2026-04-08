import {
  IAnnotationModel,
  IJGISFormSchemaRegistry,
  IJGISLayer,
  IJupyterGISModel,
  IJupyterGISSettings,
} from '@jupytergis/schema';
import { IStateDB } from '@jupyterlab/statedb';
import { CommandRegistry } from '@lumino/commands';
import * as React from 'react';

import { ITabConfig, TabbedPanel } from './components/TabbedPanel';
import { LayersBodyComponent } from './components/layers';
import { useLayerTree } from './hooks/useLayerTree';
import { useRightPanelOptions } from './hooks/useRightPanelOptions';
import { RightPanelStoryViewer } from './rightpanel';
import { AnnotationsPanel } from '../../features/annotations';
import { IdentifyPanelComponent } from '../../features/identify/IdentifyPanel';
import { ObjectPropertiesReact } from '../../features/objectproperties';
import StacPanel from '../../features/stac-browser/components/StacPanel';
import StoryEditorPanel from '../../features/story/StoryEditorPanel';
import { PreviewModeSwitch } from '../../features/story/components/PreviewModeSwitch';

export interface IMergedPanelProps {
  model: IJupyterGISModel;
  state: IStateDB;
  commands: CommandRegistry;
  settings: IJupyterGISSettings;
  formSchemaRegistry: IJGISFormSchemaRegistry;
  annotationModel: IAnnotationModel;
  addLayer?: (id: string, layer: IJGISLayer, index: number) => Promise<void>;
  removeLayer?: (id: string) => void;
}

export const MergedPanel: React.FC<IMergedPanelProps> = props => {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const handler = () => setVisible(v => !v);
    window.addEventListener('jgis:togglePanel', handler);
    return () => window.removeEventListener('jgis:togglePanel', handler);
  }, []);

  const [curTab, setCurTab] = React.useState<string>(() => {
    if (!props.settings.layersDisabled) {
      return 'layers';
    }
    if (!props.settings.objectPropertiesDisabled) {
      return 'objectProperties';
    }
    return '';
  });

  const [selectedObjectProperties, setSelectedObjectProperties] =
    React.useState(undefined);

  const { layerTree, segmentTree } = useLayerTree(props.model, props.commands, {
    onSegmentAdded: () => setCurTab('segments'),
  });

  const {
    storyMapPresentationMode,
    editorMode,
    showEditor,
    storyPanelTitle,
    toggleEditor,
  } = useRightPanelOptions(props.model, {
    onPresentationModeEnabled: () => setCurTab('storyPanel'),
    onIdentifyFeatures: () => setCurTab('identifyPanel'),
  });

  const tabs: ITabConfig[] = [
    {
      name: 'layers',
      title: 'Layers',
      enabled: !props.settings.layersDisabled && !storyMapPresentationMode,
      content: (
        <LayersBodyComponent
          model={props.model}
          commands={props.commands}
          state={props.state}
          layerTree={layerTree}
        />
      ),
    },
    {
      name: 'stac',
      title: 'Stac Browser',
      enabled: !props.settings.stacBrowserDisabled && !storyMapPresentationMode,
      content: <StacPanel model={props.model} />,
    },
    {
      name: 'segments',
      title: 'Segments',
      enabled: !props.settings.storyMapsDisabled,
      content: (
        <LayersBodyComponent
          model={props.model}
          commands={props.commands}
          state={props.state}
          layerTree={segmentTree}
        />
      ),
    },
    {
      name: 'objectProperties',
      title: 'Object Properties',
      enabled:
        !props.settings.objectPropertiesDisabled && !storyMapPresentationMode,
      content: (
        <ObjectPropertiesReact
          setSelectedObject={setSelectedObjectProperties}
          selectedObject={selectedObjectProperties}
          formSchemaRegistry={props.formSchemaRegistry}
          model={props.model}
        />
      ),
    },
    {
      name: 'storyPanel',
      title: storyPanelTitle,
      enabled: !props.settings.storyMapsDisabled,
      content: (
        <>
          {!storyMapPresentationMode && (
            <PreviewModeSwitch
              checked={!editorMode}
              onCheckedChange={toggleEditor}
            />
          )}
          {showEditor ? (
            <StoryEditorPanel model={props.model} commands={props.commands} />
          ) : curTab === 'storyPanel' ? (
            <RightPanelStoryViewer
              model={props.model}
              addLayer={props.addLayer}
              removeLayer={props.removeLayer}
            />
          ) : null}
        </>
      ),
    },
    {
      name: 'annotations',
      title: 'Annotations',
      enabled: !props.settings.annotationsDisabled,
      content: (
        <AnnotationsPanel
          annotationModel={props.annotationModel}
          jgisModel={props.model}
        />
      ),
    },
    {
      name: 'identifyPanel',
      title: 'Identified Features',
      enabled: !props.settings.identifyDisabled,
      content: <IdentifyPanelComponent model={props.model} />,
    },
  ];

  return (
    <TabbedPanel
      tabs={tabs}
      containerClassName="jgis-merged-panel-container"
      curTab={curTab}
      onTabClick={name => setCurTab(prev => (prev === name ? '' : name))}
      style={{ display: visible ? 'block' : 'none' }}
    />
  );
};
