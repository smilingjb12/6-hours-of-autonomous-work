import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[0.625rem] text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-[0_1px_2px_rgba(249,115,22,0.2)] border border-primary-600 hover:from-primary-400 hover:to-primary-500 hover:shadow-[0_4px_16px_rgba(249,115,22,0.2)] hover:-translate-y-px active:translate-y-0',
        destructive:
          'bg-gradient-to-br from-error-500 to-error-600 text-white shadow-sm border border-error-600 hover:from-error-400 hover:to-error-500 hover:shadow-[0_4px_16px_rgba(244,63,94,0.2)]',
        outline:
          'border border-secondary-300 bg-transparent text-secondary-700 hover:bg-secondary-100 hover:border-secondary-400 hover:text-secondary-800',
        secondary:
          'bg-secondary-100 text-secondary-700 border border-secondary-200 hover:bg-secondary-200 hover:border-secondary-300',
        ghost:
          'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-800',
        link:
          'text-primary-600 underline-offset-4 hover:underline hover:text-primary-500',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-[0.5rem] px-3 text-xs',
        lg: 'h-11 rounded-[0.75rem] px-8 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
