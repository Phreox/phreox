export function UserTag({ username, discriminator, className }: {
  username: string;
  discriminator: string;
  className?: string;
}) {
  return (
    <p className={className}>
      @{username}
      <span className="text-(--text-dark)">#{discriminator}</span>
    </p>
  );
}
