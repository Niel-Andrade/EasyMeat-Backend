function validarCpf(cpf) {
  if (!cpf || typeof cpf !== 'string') {
    return false;
  }

  const digits = cpf.replace(/\D/g, '');

  if (digits.length !== 11) {
    return false;
  }

  if (/^(\d)\1+$/.test(digits)) {
    return false;
  }

  const calcularDigito = (slice) => {
    let soma = 0;

    for (let i = 0; i < slice.length; i++) {
      soma += Number(slice[i]) * (slice.length + 1 - i);
    }

    const resto = (soma * 10) % 11;

    return resto === 10 ? 0 : resto;
  };

  return (
    calcularDigito(digits.slice(0, 9)) === Number(digits[9]) &&
    calcularDigito(digits.slice(0, 10)) === Number(digits[10])
  );
}

module.exports = validarCpf;