import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

const Label = ({ className, ...props }) => (
  <LabelPrimitive.Root
    className={cn(
      'text-sm font-medium leading-snug peer-disabled:cursor-not-allowed peer-disabled:opacity-70 sm:text-base sm:leading-none',
      className,
    )}
    {...props}
  />
)

export { Label }
