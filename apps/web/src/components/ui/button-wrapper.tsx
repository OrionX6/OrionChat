import { Button as OriginalButton, buttonVariants } from "./button";
import { cn } from "@/lib/utils";
import * as React from "react";

interface ButtonWrapperProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

const ButtonWrapper = React.forwardRef<HTMLButtonElement, ButtonWrapperProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

ButtonWrapper.displayName = "ButtonWrapper";

export { ButtonWrapper as Button };