import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef(({ className, type = 'text', ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-10 min-h-[44px] w-full rounded-md border border-input bg-transparent px-3.5 py-2 text-sm leading-snug shadow-sm ring-offset-background transition-[color,box-shadow,border-color] duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground file:leading-snug placeholder:text-[13px] placeholder:leading-snug placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:h-9 md:min-h-0 md:py-1',
        className,
      )}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
