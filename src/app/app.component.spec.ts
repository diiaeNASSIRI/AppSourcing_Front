import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { AppComponent } from './app.component';
import { AuthService } from './my-service/auth.service';

class AuthServiceStub {
  logout = jasmine.createSpy('logout');
  isLoggedIn$() { return of(false); }
  getEmailFromToken() { return null; }
  isAdmin() { return false; }
}

describe('AppComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [RouterTestingModule],
    declarations: [AppComponent],
    providers: [{ provide: AuthService, useClass: AuthServiceStub }],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
  }));

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'appsourcing-frontend-01'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('appsourcing-frontend-01');
  });

  it('should render chrome shell when enabled', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const component = fixture.componentInstance;
    component.showChrome = true;
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-navbar')).toBeTruthy();
  });
});
