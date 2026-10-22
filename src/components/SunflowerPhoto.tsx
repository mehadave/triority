const WIDTHS = [256, 512, 1024] as const;
const srcset = (ext: string) => WIDTHS.map((w) => `/img/sunflower-${w}.${ext} ${w}w`).join(', ');

/** The crochet sunflower, served as AVIF/WebP. Always decorative. */
export function SunflowerPhoto({
  sizes,
  eager = false,
  className,
}: {
  sizes: string;
  eager?: boolean;
  className?: string;
}) {
  return (
    <picture>
      <source type="image/avif" srcSet={srcset('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcset('webp')} sizes={sizes} />
      <img
        src="/img/sunflower-512.webp"
        alt=""
        aria-hidden="true"
        width={512}
        height={512}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        className={className}
      />
    </picture>
  );
}
