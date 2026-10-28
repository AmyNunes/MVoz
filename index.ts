// Ponto de entrada do app.
import 'expo-router/entry';

import { defineNotificationTask } from './src/notifications/backgroundTask';

// A tarefa de notificações em segundo plano precisa ser definida no carregamento
// (o Android pode abrir só ela, com o app fechado, para o "Mais tarde (+1 h)").
defineNotificationTask();
