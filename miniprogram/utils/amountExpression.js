const OPERATOR_PRECEDENCE = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2
};

const normalizeAmountExpression = function (input) {
  return String(input || '')
    .replace(/[０-９]/g, function (char) {
      return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
    })
    .replace(/[＋]/g, '+')
    .replace(/[－]/g, '-')
    .replace(/[×xX＊]/g, '*')
    .replace(/[÷／]/g, '/')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[，]/g, '.')
    .replace(/[。．]/g, '.');
};

const sanitizeAmountExpression = function (input) {
  return normalizeAmountExpression(input).replace(/[^0-9.+\-*/()]/g, '');
};

const readNumberToken = function (expression, startIndex, sign) {
  let index = startIndex;
  let dotCount = 0;
  let digitCount = 0;
  let raw = sign || '';

  while (index < expression.length) {
    const char = expression[index];
    if (char >= '0' && char <= '9') {
      digitCount++;
      raw += char;
      index++;
      continue;
    }

    if (char === '.') {
      dotCount++;
      if (dotCount > 1) {
        throw new Error('金额格式有误');
      }
      raw += char;
      index++;
      continue;
    }

    break;
  }

  if (digitCount === 0) {
    throw new Error('金额格式有误');
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error('金额格式有误');
  }

  return {
    token: { type: 'number', value },
    nextIndex: index
  };
};

const tokenize = function (expression) {
  const tokens = [];
  let index = 0;
  let expectingValue = true;

  while (index < expression.length) {
    const char = expression[index];
    const nextChar = expression[index + 1];

    if ((char >= '0' && char <= '9') || char === '.') {
      const result = readNumberToken(expression, index);
      tokens.push(result.token);
      index = result.nextIndex;
      expectingValue = false;
      continue;
    }

    if ((char === '+' || char === '-') && expectingValue) {
      if ((nextChar >= '0' && nextChar <= '9') || nextChar === '.') {
        const result = readNumberToken(expression, index + 1, char);
        tokens.push(result.token);
        index = result.nextIndex;
        expectingValue = false;
        continue;
      }

      if (nextChar === '(') {
        if (char === '-') {
          tokens.push({ type: 'number', value: 0 });
          tokens.push({ type: 'operator', value: '-' });
        }
        index++;
        continue;
      }
    }

    if (char === '(') {
      tokens.push({ type: 'leftParen' });
      index++;
      expectingValue = true;
      continue;
    }

    if (char === ')') {
      tokens.push({ type: 'rightParen' });
      index++;
      expectingValue = false;
      continue;
    }

    if (OPERATOR_PRECEDENCE[char]) {
      if (expectingValue) {
        throw new Error('金额表达式有误');
      }
      tokens.push({ type: 'operator', value: char });
      index++;
      expectingValue = true;
      continue;
    }

    throw new Error('金额表达式有误');
  }

  if (tokens.length === 0 || expectingValue) {
    throw new Error('金额表达式有误');
  }

  return tokens;
};

const toReversePolishNotation = function (tokens) {
  const output = [];
  const operators = [];

  tokens.forEach(function (token) {
    if (token.type === 'number') {
      output.push(token);
      return;
    }

    if (token.type === 'operator') {
      while (operators.length > 0) {
        const top = operators[operators.length - 1];
        if (top.type !== 'operator') break;
        if (OPERATOR_PRECEDENCE[top.value] < OPERATOR_PRECEDENCE[token.value]) break;
        output.push(operators.pop());
      }
      operators.push(token);
      return;
    }

    if (token.type === 'leftParen') {
      operators.push(token);
      return;
    }

    if (token.type === 'rightParen') {
      let hasLeftParen = false;
      while (operators.length > 0) {
        const top = operators.pop();
        if (top.type === 'leftParen') {
          hasLeftParen = true;
          break;
        }
        output.push(top);
      }
      if (!hasLeftParen) {
        throw new Error('括号不匹配');
      }
    }
  });

  while (operators.length > 0) {
    const top = operators.pop();
    if (top.type === 'leftParen') {
      throw new Error('括号不匹配');
    }
    output.push(top);
  }

  return output;
};

const evaluateReversePolishNotation = function (tokens) {
  const stack = [];

  tokens.forEach(function (token) {
    if (token.type === 'number') {
      stack.push(token.value);
      return;
    }

    if (stack.length < 2) {
      throw new Error('金额表达式有误');
    }

    const right = stack.pop();
    const left = stack.pop();

    if (token.value === '+') stack.push(left + right);
    if (token.value === '-') stack.push(left - right);
    if (token.value === '*') stack.push(left * right);
    if (token.value === '/') {
      if (right === 0) {
        throw new Error('不能除以0');
      }
      stack.push(left / right);
    }
  });

  if (stack.length !== 1 || !Number.isFinite(stack[0])) {
    throw new Error('金额表达式有误');
  }

  return stack[0];
};

const evaluateAmountExpression = function (input) {
  const expression = sanitizeAmountExpression(input);
  const tokens = tokenize(expression);
  const rpn = toReversePolishNotation(tokens);
  const result = evaluateReversePolishNotation(rpn);

  if (!Number.isFinite(result)) {
    throw new Error('金额表达式有误');
  }

  return Math.round((result + Number.EPSILON) * 100) / 100;
};

const formatAmountExpression = function (input) {
  return evaluateAmountExpression(input).toFixed(2);
};

module.exports = {
  evaluateAmountExpression,
  formatAmountExpression,
  sanitizeAmountExpression
};
