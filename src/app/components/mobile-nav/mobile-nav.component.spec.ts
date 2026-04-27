import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MobileNavComponent } from './mobile-nav.component';
import { routes } from '../../app.routes';

describe('MobileNavComponent', () => {
  let component: MobileNavComponent;
  let fixture: ComponentFixture<MobileNavComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileNavComponent],
      providers: [provideRouter(routes)],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileNavComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
