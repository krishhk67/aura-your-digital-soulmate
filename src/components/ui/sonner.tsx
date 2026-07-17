import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="top-center"
      visibleToasts={3}
      duration={2800}
      offset="calc(env(safe-area-inset-top, 0px) + 16px)"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast pointer-events-auto backdrop-blur-xl bg-background/70 text-foreground border border-white/10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] rounded-2xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toast]:!border-emerald-400/30",
          error: "group-[.toast]:!border-red-400/30",
          warning: "group-[.toast]:!border-amber-400/30",
          info: "group-[.toast]:!border-cyan-400/30",
        },
        style: {
          maxWidth: "420px",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
