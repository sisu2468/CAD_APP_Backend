function success(data = {}) {
  return {
    status: 'success',
    data,
  };
}

function error(code, message, details) {
  const payload = {
    status: 'error',
    code,
    message,
  };

  if (details) {
    payload.details = details;
  }

  return payload;
}

module.exports = {
  success,
  error,
};

