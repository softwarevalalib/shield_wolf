import { cn } from '@/utils/cn';

export function Skeleton({ className, ...props }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-border/70', className)}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn('h-3 w-full', index === lines - 1 && lines > 1 && 'w-2/3')}
        />
      ))}
    </div>
  );
}
