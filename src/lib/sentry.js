// Sentry - Monitoramento de Erros em Produção
// Configuração centralizada para captura de exceções

import * as Sentry from '@sentry/node';

const SENTRY_DSN = process.env.SENTRY_DSN;
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT === 'production';

let isInitialized = false;

/**
 * Inicializa Sentry se DSN estiver configurado
 */
export function initSentry() {
  if (isInitialized) return;

  if (!SENTRY_DSN) {
    console.log('⚠️ Sentry DSN não configurado - monitoramento de erros desativado');
    console.log('   Para ativar, adicione SENTRY_DSN nas variáveis de ambiente');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: IS_PRODUCTION ? 'production' : 'development',

      // Captura 100% dos erros, mas apenas 10% das transações (performance)
      tracesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,

      // Informações do release
      release: process.env.RAILWAY_GIT_COMMIT_SHA || 'local',

      // Ignora erros conhecidos/esperados
      ignoreErrors: [
        'Rate limit exceeded',
        'Circuit is OPEN',
        'Request timeout'
      ],

      // Antes de enviar, remove dados sensíveis
      beforeSend(event) {
        // Remove API keys de breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map(bc => {
            if (bc.data) {
              delete bc.data.apiKey;
              delete bc.data.authorization;
            }
            return bc;
          });
        }
        return event;
      }
    });

    isInitialized = true;
    console.log('✅ Sentry inicializado - monitoramento de erros ativo');
  } catch (error) {
    console.error('❌ Falha ao inicializar Sentry:', error.message);
  }
}

/**
 * Captura exceção e envia para Sentry
 * @param {Error} error - Erro a ser capturado
 * @param {Object} context - Contexto adicional
 */
export function captureException(error, context = {}) {
  console.error('Error captured:', error.message);

  if (!isInitialized) return;

  Sentry.withScope(scope => {
    // Adiciona contexto extra
    if (context.user) {
      scope.setUser({ id: context.user });
    }
    if (context.conversationId) {
      scope.setTag('conversationId', context.conversationId);
    }
    if (context.service) {
      scope.setTag('service', context.service);
    }
    if (context.extra) {
      scope.setExtras(context.extra);
    }

    Sentry.captureException(error);
  });
}

/**
 * Captura mensagem informativa
 * @param {string} message - Mensagem
 * @param {string} level - Nível (info, warning, error)
 */
export function captureMessage(message, level = 'info') {
  if (!isInitialized) return;
  Sentry.captureMessage(message, level);
}

/**
 * Define usuário atual (para tracking)
 * @param {Object} user - Dados do usuário
 */
export function setUser(user) {
  if (!isInitialized) return;
  Sentry.setUser(user);
}

/**
 * Adiciona breadcrumb (rastro de ação)
 * @param {Object} breadcrumb - Dados do breadcrumb
 */
export function addBreadcrumb(breadcrumb) {
  if (!isInitialized) return;
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Flush - garante que todos os eventos foram enviados
 * Útil antes de encerrar o processo
 */
export async function flush(timeout = 2000) {
  if (!isInitialized) return;
  await Sentry.close(timeout);
}

export default {
  initSentry,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  flush
};
