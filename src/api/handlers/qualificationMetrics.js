// ============================================
// CAMILA 2.0 - HANDLER DE MÉTRICAS DE QUALIFICAÇÃO
// ============================================
// Endpoint para consultar métricas do sistema de qualificação
// Permite medir eficácia e validar resultados do projeto
// ============================================

import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient.js';
import logger from '../../lib/logger.js';

/**
 * Obtém resumo das métricas de qualificação
 * @param {number} daysBack - Número de dias para buscar (padrão: 7)
 * @returns {Promise<object>} Métricas agregadas
 */
export async function getQualificationSummary(daysBack = 7) {
  try {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        error: 'Supabase não configurado',
        message: 'Configure as variáveis de ambiente do Supabase'
      };
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Busca todas as métricas do período
    const { data: metrics, error } = await supabase
      .from('qualification_metrics')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Erro ao buscar métricas:', error);
      return {
        success: false,
        error: error.message
      };
    }

    // Calcula estatísticas
    const total = metrics.length;
    const approved = metrics.filter(m => m.metric_type === 'approved').length;
    const blocked = metrics.filter(m => m.metric_type === 'blocked').length;
    const warnings = metrics.filter(m => m.metric_type === 'warning').length;

    // Agrupa bloqueios por motivo
    const blockReasons = {};
    metrics
      .filter(m => m.metric_type === 'blocked' && m.block_reason)
      .forEach(m => {
        blockReasons[m.block_reason] = (blockReasons[m.block_reason] || 0) + 1;
      });

    // Agrupa por intenção detectada
    const intents = {};
    metrics
      .filter(m => m.detected_intent)
      .forEach(m => {
        intents[m.detected_intent] = (intents[m.detected_intent] || 0) + 1;
      });

    const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(2) : 0;
    const blockRate = total > 0 ? ((blocked / total) * 100).toFixed(2) : 0;

    logger.info('Métricas de qualificação calculadas:', {
      period: `${daysBack} dias`,
      total,
      approved,
      blocked,
      approvalRate: `${approvalRate}%`
    });

    return {
      success: true,
      period: {
        days: daysBack,
        start: startDate.toISOString(),
        end: new Date().toISOString()
      },
      summary: {
        total,
        approved,
        blocked,
        warnings,
        approvalRate: parseFloat(approvalRate),
        blockRate: parseFloat(blockRate)
      },
      blockReasons,
      intents,
      recentMetrics: metrics.slice(0, 20) // Últimas 20 métricas
    };
  } catch (error) {
    logger.error('Erro ao calcular métricas:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtém métricas agrupadas por dia
 * @param {number} daysBack - Número de dias para buscar
 * @returns {Promise<object>} Métricas por dia
 */
export async function getQualificationByDay(daysBack = 30) {
  try {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase não configurado' };
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const { data: metrics, error } = await supabase
      .from('qualification_metrics')
      .select('metric_type, created_at')
      .gte('created_at', startDate.toISOString());

    if (error) {
      return { success: false, error: error.message };
    }

    // Agrupa por dia
    const byDay = {};
    metrics.forEach(m => {
      const day = m.created_at.split('T')[0];
      if (!byDay[day]) {
        byDay[day] = { approved: 0, blocked: 0, warnings: 0, total: 0 };
      }
      byDay[day][m.metric_type === 'warning' ? 'warnings' : m.metric_type]++;
      byDay[day].total++;
    });

    // Converte para array ordenado
    const dailyStats = Object.entries(byDay)
      .map(([date, stats]) => ({
        date,
        ...stats,
        approvalRate: stats.total > 0 ? ((stats.approved / stats.total) * 100).toFixed(2) : 0
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      success: true,
      dailyStats
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Handler HTTP para GET /api/qualification-metrics
 */
export async function handleGetQualificationMetrics(req, res) {
  try {
    const days = parseInt(req.query.days) || 7;
    const result = await getQualificationSummary(days);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    logger.error('Erro no handler de métricas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handler HTTP para GET /api/qualification-metrics/daily
 */
export async function handleGetQualificationDaily(req, res) {
  try {
    const days = parseInt(req.query.days) || 30;
    const result = await getQualificationByDay(days);

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
