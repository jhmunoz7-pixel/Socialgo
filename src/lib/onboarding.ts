/**
 * Onboarding tasks for new agencies.
 * Each task has an ID, label, description, link, and a check function
 * that determines if the task is complete based on app data.
 */

export interface OnboardingTask {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: string; // emoji for simplicity in non-component context
}

export const ONBOARDING_TASKS: OnboardingTask[] = [
  {
    id: 'add_clients',
    label: 'Agrega a tus clientes y conecta sus cuentas',
    description: 'Da de alta las marcas que gestiona tu agencia',
    href: '/dashboard',
    icon: '👥',
  },
  {
    id: 'add_packages',
    label: 'Agrega los paquetes que ofreces en tu agencia',
    description: 'Define tus planes de servicio con precios y features',
    href: '/dashboard/packages',
    icon: '📦',
  },
  {
    id: 'add_members',
    label: 'Agrega a miembros de tu equipo',
    description: 'Invita creativos, admins y colaboradores',
    href: '/dashboard/settings',
    icon: '🤝',
  },
  {
    id: 'plan_posts',
    label: 'Planifica los posts de una marca',
    description: 'Crea tu primera parrilla de contenido',
    href: '/dashboard/planning',
    icon: '📅',
  },
  {
    id: 'connect_canva',
    label: 'Conecta tu diseño de Canva',
    description: 'Agrega un diseño de Canva al board de WIP',
    href: '/dashboard/wip',
    icon: '🎨',
  },
  {
    id: 'send_to_review',
    label: 'Manda el primer diseño a revisión',
    description: 'Asigna un diseño de Canva a un post para revisión interna',
    href: '/dashboard/contenido',
    icon: '📋',
  },
  {
    id: 'client_approval',
    label: 'Consigue aprobación de diseño de un cliente',
    description: 'Comparte un post para que tu cliente lo apruebe',
    href: '/dashboard/contenido',
    icon: '✅',
  },
  {
    id: 'first_publish',
    label: 'Postea tu primer post',
    description: 'Publica contenido directo a Instagram o Facebook',
    href: '/dashboard/contenido',
    icon: '🚀',
  },
  {
    id: 'send_report',
    label: 'Manda un reporte a tu cliente',
    description: 'Exporta las estadísticas y compártelas',
    href: '/dashboard/reports',
    icon: '📊',
  },
];

/**
 * Check which onboarding tasks are completed based on current data.
 * Returns a Set of completed task IDs.
 */
export function getCompletedTasks(data: {
  clientsCount: number;
  packagesCount: number;
  membersCount: number;
  postsCount: number;
  canvaDesignsCount: number;
  reviewPostsCount: number; // posts in review stage
  approvedPostsCount: number;
  publishedPostsCount: number;
}): Set<string> {
  const completed = new Set<string>();

  if (data.clientsCount > 0) completed.add('add_clients');
  if (data.packagesCount > 0) completed.add('add_packages');
  if (data.membersCount > 1) completed.add('add_members'); // >1 because owner counts as 1
  if (data.postsCount > 0) completed.add('plan_posts');
  if (data.canvaDesignsCount > 0) completed.add('connect_canva');
  if (data.reviewPostsCount > 0) completed.add('send_to_review');
  if (data.approvedPostsCount > 0) completed.add('client_approval');
  if (data.publishedPostsCount > 0) completed.add('first_publish');
  // send_report is manual — we can't detect it automatically, so it stays incomplete until dismissed

  return completed;
}
