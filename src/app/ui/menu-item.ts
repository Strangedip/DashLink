export interface MenuItem {
  label?: string;
  icon?: string;
  command?: (event?: { originalEvent?: Event }) => void;
  routerLink?: string | string[];
  disabled?: boolean;
  separator?: boolean;
}
