export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  try {
    // 基本ヘルスチェック
    const healthStatus: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
        external: Math.round(process.memoryUsage().external / 1024 / 1024 * 100) / 100
      },
      env: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      responseTime: Date.now() - startTime
    }

    // Dify API 接続確認（オプション）
    const config = useRuntimeConfig()
    if (config.difyApiKey && config.difyApiBaseUrl) {
      try {
        await $fetch(`${config.difyApiBaseUrl}/info`, {
          headers: {
            'Authorization': `Bearer ${config.difyApiKey}`,
          },
          timeout: 5000
        })
        healthStatus.externalServices = { dify: 'connected' }
      } catch (error) {
        healthStatus.externalServices = { dify: 'disconnected' }
      }
    }

    setResponseStatus(event, 200)
    return healthStatus
  } catch (error) {
    setResponseStatus(event, 503)
    return {
      status: 'unhealthy',
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }
  }
})