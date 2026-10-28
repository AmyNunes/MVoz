// Roda antes de cada arquivo de teste.
// https://docs.swmansion.com/react-native-reanimated/docs/guides/testing/
import 'react-native-gesture-handler/jestSetup';
import { setUpTests } from 'react-native-reanimated';

setUpTests();

// O Gesture Handler 3 chama `getUIRuntimeHolder` do Worklets ao ser importado. No Jest o Worklets
// usa a versão "web", que lança erro nessa função: aqui ela devolve um objeto vazio.
jest.mock('react-native-worklets', () => ({
  ...jest.requireActual('react-native-worklets'),
  getUIRuntimeHolder: () => ({}),
}));

// No Jest do SDK 58, a fonte dos ícones (@expo/vector-icons) não existe no registro de arquivos
// e o carregamento falha. Nos testes, a fonte conta como já carregada.
jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  isLoaded: () => true,
  loadAsync: () => Promise.resolve(),
}));
