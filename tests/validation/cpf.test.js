
const validarCpf = require('../../src/validation/cpf');

describe('Validação de CPF', () => {
  test('CPF-001: deve aceitar CPF válido sem pontuação', () => {
    expect(validarCpf('52998224725')).toBe(true);
  });

  test('CPF-002: deve aceitar CPF válido com pontuação', () => {
    expect(validarCpf('529.982.247-25')).toBe(true);
  });

  test('CPF-003: deve rejeitar CPF com quantidade incorreta de dígitos', () => {
    expect(validarCpf('5299822472')).toBe(false);
  });

  test('CPF-004: deve rejeitar CPF com todos os dígitos iguais', () => {
    expect(validarCpf('11111111111')).toBe(false);
  });

  test('CPF-005: deve rejeitar CPF com primeiro dígito verificador incorreto', () => {
    expect(validarCpf('52998224715')).toBe(false);
  });

  test('CPF-006: deve rejeitar CPF com segundo dígito verificador incorreto', () => {
    expect(validarCpf('52998224724')).toBe(false);
  });

  test('CPF-007: deve rejeitar CPF vazio', () => {
    expect(validarCpf('')).toBe(false);
  });

  test('CPF-008: deve rejeitar valor nulo', () => {
    expect(validarCpf(null)).toBe(false);
  });

  test('CPF-009: deve rejeitar valor indefinido', () => {
    expect(validarCpf(undefined)).toBe(false);
  });

  test('CPF-010: deve rejeitar CPF enviado como número', () => {
    expect(validarCpf(52998224725)).toBe(false);
  });
});
