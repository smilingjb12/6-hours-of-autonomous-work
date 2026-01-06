import * as React from 'react'

import { cn } from '@lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-[0.625rem] px-3.5 py-2 text-sm',
          'bg-white text-secondary-800 border border-secondary-300',
          'transition-all duration-200',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-secondary-700',
          'placeholder:text-secondary-400',
          'focus-visible:outline-none focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
