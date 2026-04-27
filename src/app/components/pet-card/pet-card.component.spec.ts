import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PetCardComponent } from './pet-card.component';
import { routes } from '../../app.routes';

const mockAlert = {
  id: 'cooper',
  name: 'Cooper',
  status: 'Lost' as const,
  species: 'dog' as const,
  breed: 'Golden Retriever',
  breedVariant: 'tertiary' as const,
  location: 'Oneroa',
  lat: -36.79,
  lng: 175.01,
  description: 'Test description',
  reportedAgo: '2h ago',
  imageUrl: 'https://example.com/x.jpg',
  imageAlt: 'Dog',
};

describe('PetCardComponent', () => {
  let fixture: ComponentFixture<PetCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PetCardComponent],
      providers: [provideRouter(routes)],
    }).compileComponents();

    fixture = TestBed.createComponent(PetCardComponent);
    fixture.componentRef.setInput('alert', mockAlert);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
