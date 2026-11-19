export function configureRepositoryLink(link, repositoryUrl) {
  if (!link || !repositoryUrl) return false;
  link.href = repositoryUrl;
  link.hidden = false;
  return true;
}
