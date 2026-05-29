export function onRouterTransitionStart(
  url: string,
  navigationType: 'push' | 'replace' | 'traverse'
) {
  window.dispatchEvent(
    new CustomEvent('kino:route-transition-start', {
      detail: { url, navigationType },
    })
  );
}
