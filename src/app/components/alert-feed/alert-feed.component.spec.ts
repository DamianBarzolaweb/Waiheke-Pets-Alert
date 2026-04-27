import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AlertFeedComponent } from './alert-feed.component';
import { routes } from '../../app.routes';

describe('AlertFeedComponent', () => {
  let component: AlertFeedComponent;
  let fixture: ComponentFixture<AlertFeedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertFeedComponent],
      providers: [provideRouter(routes)],
    }).compileComponents();

    fixture = TestBed.createComponent(AlertFeedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
