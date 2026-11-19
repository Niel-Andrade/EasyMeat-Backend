process.env.NODE_ENV = 'test';
process.env.ROTAS_PUBLICAS = 'GET:/health';

const request = require('supertest');
const app = require('../../src/app');

describe('API - Health Check', () => {
  test('deve retornar HTTP 200 ao verificar a saúde da aplicação', async () => {
    const resposta = await request(app).get('/health');

    expect(resposta.status).toBe(200);
  });

  test('deve retornar status ok no corpo da resposta', async () => {
    const resposta = await request(app).get('/health');

    expect(resposta.body).toEqual({
      status: 'ok',
    });
  });
});
