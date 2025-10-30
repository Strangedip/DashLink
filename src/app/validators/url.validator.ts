import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function urlValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null; // Don't validate empty values
    }

    try {
      const url = new URL(control.value);
      // Check if protocol is http or https
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return { invalidUrl: { value: control.value, message: 'URL must start with http:// or https://' } };
      }
      return null;
    } catch {
      return { invalidUrl: { value: control.value, message: 'Invalid URL format' } };
    }
  };
}

