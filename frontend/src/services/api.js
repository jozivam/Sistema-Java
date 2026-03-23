const BASE_URL = '/api';

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Erro ao processar requisição.');
  }
  return data;
}

export const api = {
  bootstrap: () => request('/bootstrap'),
  importWorkbook: (payload) => request('/imports', { method: 'POST', body: JSON.stringify(payload) }),
  createLancamento: (payload) => request('/lancamentos', { method: 'POST', body: JSON.stringify(payload) }),
  updateLancamento: (id, payload) => request(`/lancamentos/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteLancamento: (id) => request(`/lancamentos/${id}`, { method: 'DELETE' })
};
