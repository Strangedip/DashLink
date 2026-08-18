import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LinkPreviewService {
  displayImage(uploaded: string | null | undefined, _link?: string | null): Observable<string | null> {
    return of(uploaded || null);
  }
}
