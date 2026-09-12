export function applyLegacyAvatarBridge(avatarUrl?: string | null) {
  if (typeof document === 'undefined') return
  const avatars = document.querySelectorAll<HTMLElement>('.avatar')
  avatars.forEach((avatar) => {
    if (avatarUrl) {
      avatar.style.backgroundImage = `url("${avatarUrl}")`
      avatar.style.backgroundSize = 'cover'
      avatar.style.backgroundPosition = 'center'
      avatar.style.backgroundRepeat = 'no-repeat'
      avatar.style.color = 'transparent'
      avatar.setAttribute('aria-label', 'Customer profile picture')
    } else {
      avatar.style.backgroundImage = ''
      avatar.style.backgroundSize = ''
      avatar.style.backgroundPosition = ''
      avatar.style.backgroundRepeat = ''
      avatar.style.color = ''
      avatar.removeAttribute('aria-label')
    }
  })
}
