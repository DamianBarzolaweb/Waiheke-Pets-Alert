import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AlertDetailComponent } from './alert-detail.component';
import { routes } from '../../app.routes';

describe('AlertDetailComponent', () => {
  let component: AlertDetailComponent;
  let fixture: ComponentFixture<AlertDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertDetailComponent],
      providers: [
        provideRouter(routes),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: 'cooper' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AlertDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
