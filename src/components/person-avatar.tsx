export function PersonAvatar({ sex }: { sex: string }) {
  const code = sex.trim().toUpperCase();
  const variant = code === 'M' ? 'male' : code === 'F' ? 'female' : 'neutral';
  const label = {
    male: 'Male avatar',
    female: 'Female avatar',
    neutral: 'Neutral avatar',
  }[variant];

  return (
    <span className="profile-avatar" data-variant={variant} role="img" aria-label={label}>
      <span className="profile-avatar-hair" aria-hidden="true" />
      <span className="profile-avatar-head" aria-hidden="true" />
    </span>
  );
}
