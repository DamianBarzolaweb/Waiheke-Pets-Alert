import { NgClass } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-report',
  imports: [ReactiveFormsModule, RouterLink, NgClass],
  templateUrl: './report.component.html',
  styleUrl: './report.component.scss',
})
export class ReportComponent {
  private readonly fb = inject(FormBuilder);

  readonly kind = signal<'lost' | 'sighted'>('lost');

  readonly form = this.fb.nonNullable.group({
    petName: ['', Validators.required],
    breed: [''],
    seenDate: [''],
    seenTime: [''],
    description: ['', Validators.required],
  });

  setKind(next: 'lost' | 'sighted'): void {
    this.kind.set(next);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // Placeholder: conectar a API más adelante
    this.form.reset();
    this.kind.set('lost');
  }
}
