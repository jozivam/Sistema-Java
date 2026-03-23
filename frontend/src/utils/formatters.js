export const currency = (value = 0) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0));

export const dateToLabel = (value = '') => {
  if (!value) return '-';
  const [year, month, day] = value.split('-');
  if (!day) return value;
  return `${day}/${month}/${year}`;
};

export const monthLabel = (value = '') => {
  if (!value) return 'Sem período';
  const [year, month] = value.split('-');
  return `${month}/${year}`;
};

export const slugify = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
