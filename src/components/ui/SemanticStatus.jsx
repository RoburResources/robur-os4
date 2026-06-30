import { cn } from "@/lib/utils";
import {
  CheckCircle, Clock, UserCheck, Truck, Navigation,
  Wrench, AlertTriangle, FileText, Circle, Square, Triangle, Hexagon
} from "lucide-react";

/**
 * SemanticStatus — replaces abstract colored dots with shape + icon + color encoding.
 * Field staff can process status peripherally without reading text.
 *
 * Encoding system:
 *  Shape:  circle=active/in-motion · square=stationary/idle · triangle=warning · hexagon=critical
 *  Icon:   contextual action glyph inside the shape
 *  Color:  emerald=good · yellow=attention · red=critical · steel=neutral
 */

const config = {
  // Job statuses
  created:     { shape: "circle",   icon: FileText,      color: "sky",      label: "Created" },
  scheduled:   { shape: "circle",   icon: Clock,         color: "sky",      label: "Scheduled" },
  assigned:    { shape: "square",   icon: UserCheck,     color: "yellow",   label: "Assigned" },
  dispatched:  { shape: "circle",   icon: Truck,         color: "emerald",  label: "Dispatched" },
  en_route:    { shape: "circle",   icon: Navigation,    color: "emerald",  label: "En Route" },
  completed:   { shape: "circle",   icon: CheckCircle,   color: "emerald",  label: "Completed" },

  // Vehicle statuses
  active:      { shape: "circle",   icon: Truck,         color: "emerald",  label: "Active" },
  idle:        { shape: "square",   icon: Circle,        color: "steel",    label: "Idle" },
  maintenance: { shape: "hexagon",  icon: Wrench,        color: "red",      label: "Maintenance" },
  warning:     { shape: "triangle", icon: AlertTriangle, color: "yellow",   label: "Warning" },
  critical:    { shape: "hexagon",  icon: AlertTriangle, color: "red",      label: "Critical" },
};

const colorMap = {
  emerald: { bg: "bg-emerald-400", text: "text-emerald-700", ring: "ring-emerald-200", glow: "status-active" },
  yellow:  { bg: "bg-robur-yellow", text: "text-amber-700", ring: "ring-amber-200", glow: "status-warning" },
  red:     { bg: "bg-red-500", text: "text-red-700", ring: "ring-red-200", glow: "status-critical" },
  sky:     { bg: "bg-sky-400", text: "text-sky-700", ring: "ring-sky-200", glow: "" },
  steel:   { bg: "bg-robur-steel", text: "text-robur-steel", ring: "ring-robur-light/30", glow: "" },
};

const sizeMap = {
  xs: { box: "h-4 w-4", icon: "h-2 w-2", text: "text-[9px]" },
  sm: { box: "h-5 w-5", icon: "h-2.5 w-2.5", text: "text-[10px]" },
  md: { box: "h-6 w-6", icon: "h-3 w-3", text: "text-xs" },
  lg: { box: "h-8 w-8", icon: "h-4 w-4", text: "text-sm" },
};

function ShapeWrapper({ shape, className, children }) {
  if (shape === "circle")
    return <div className={cn("rounded-full flex items-center justify-center", className)}>{children}</div>;
  if (shape === "square")
    return <div className={cn("rounded-md flex items-center justify-center", className)}>{children}</div>;
  if (shape === "triangle")
    return <div className={cn("flex items-center justify-center", className)} style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}>{children}</div>;
  if (shape === "hexagon")
    return <div className={cn("flex items-center justify-center", className)} style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }}>{children}</div>;
  return <div className={cn("rounded-full flex items-center justify-center", className)}>{children}</div>;
}

export default function SemanticStatus({ status = "active", size = "sm", label = false, showIcon = true }) {
  const cfg = config[status] || config.idle;
  const colors = colorMap[cfg.color];
  const sizes = sizeMap[size];
  const Icon = cfg.icon;

  return (
    <span className="inline-flex items-center gap-1.5">
      <ShapeWrapper shape={cfg.shape} className={cn(sizes.box, colors.bg, colors.glow, "ring-2", colors.ring, "shrink-0")}>
        {showIcon && <Icon className={cn(sizes.icon, "text-white")} strokeWidth={2.5} />}
      </ShapeWrapper>
      {label && (
        <span className={cn("font-semibold", sizes.text, colors.text)}>{cfg.label}</span>
      )}
    </span>
  );
}