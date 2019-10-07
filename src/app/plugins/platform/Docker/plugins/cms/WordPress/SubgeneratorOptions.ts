import DockerfileHelper from '../../../dockerfile/DockerfileHelper';
import ComposeEditor from '../../../ComposeEditor';

interface SubgeneratorOptions {
  useGesso: boolean;
  documentRoot: string;
  shouldInstall: boolean;
  dockerfile: DockerfileHelper;
  composeEditor: ComposeEditor;
  composeCliEditor: ComposeEditor;
}

export default SubgeneratorOptions;
