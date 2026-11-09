import Image from 'next/image'

export function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <Image
      src="/coosajo-micoope-logo.png"
      alt="COOSAJO R.L. y MICOOPE"
      width={2500}
      height={500}
      priority
      className={className}
    />
  )
}
