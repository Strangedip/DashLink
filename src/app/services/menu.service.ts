import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class MenuService {
    private menuOpenedSource = new Subject<string | null>();
    menuOpened$ = this.menuOpenedSource.asObservable();

    openMenu(menuId: string): void {
        this.menuOpenedSource.next(menuId);
    }

    closeAllMenusExcept(menuId: string | null): void {
        this.menuOpenedSource.next(menuId);
    }
} 