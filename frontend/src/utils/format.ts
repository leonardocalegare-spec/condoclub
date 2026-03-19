export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

export const getTimeRemaining = (deadline: string): string => {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return 'Encerrado';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return `${days} dia${days > 1 ? 's' : ''} restante${days > 1 ? 's' : ''}`;
  }
  return `${hours} hora${hours > 1 ? 's' : ''} restante${hours > 1 ? 's' : ''}`;
};

export const getDiscountPercent = (original: number, current: number): number => {
  return Math.round(((original - current) / original) * 100);
};
