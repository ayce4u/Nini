import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonIcon } from '@ionic/angular';
import { AuthService } from '../../core/auth.service';

interface Slide {
  icon: string;
  accent: string;
  title: string;
  text: string;
  chips: string[];
}

/** Les trois écrans de présentation, au tout premier lancement. */
@Component({
  selector: 'app-onboarding',
  imports: [IonContent, IonButton, IonIcon],
  template: `
    <ion-content [fullscreen]="true" class="onb">
      <div class="shell">
        <header>
          <span class="logo">Ɲini</span>
          <button class="skip" (click)="finish()">Passer</button>
        </header>

        <div class="slides" #slides (scroll)="onScroll()">
          @for (s of items; track s.title) {
            <section class="slide">
              <div class="art" [style.background]="s.accent">
                <div class="ring"></div>
                <ion-icon [name]="s.icon" />
                @for (c of s.chips; track c; let i = $index) {
                  <span class="chip c{{ i }}">{{ c }}</span>
                }
              </div>
              <h1>{{ s.title }}</h1>
              <p>{{ s.text }}</p>
            </section>
          }
        </div>

        <footer>
          <div class="dots">
            @for (s of items; track s.title; let i = $index) {
              <span [class.on]="i === index()" (click)="go(i)"></span>
            }
          </div>
          <ion-button expand="block" (click)="next()">
            {{ index() === items.length - 1 ? 'Commencer' : 'Suivant' }}
            <ion-icon slot="end" name="arrow-forward" />
          </ion-button>
        </footer>
      </div>
    </ion-content>
  `,
  styles: `
    .onb { --background: var(--nini-cream); }
    .shell { min-height: 100%; display: flex; flex-direction: column; max-width: 520px; margin: 0 auto;
      padding: calc(12px + env(safe-area-inset-top)) 0 calc(16px + env(safe-area-inset-bottom)); }
    header { display: flex; justify-content: space-between; align-items: center; padding: 8px 24px; }
    .logo { font-size: 26px; font-weight: 800; color: var(--ion-color-primary); letter-spacing: -0.03em; }
    .skip { background: none; color: var(--nini-muted); font-weight: 700; font-size: 15px; cursor: pointer; }
    .slides { flex: 1; display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
    .slides::-webkit-scrollbar { display: none; }
    .slide { flex: 0 0 100%; scroll-snap-align: center; padding: 16px 28px; display: flex; flex-direction: column; justify-content: center; }
    .art { position: relative; height: 300px; border-radius: 32px; display: grid; place-items: center; margin-bottom: 32px; overflow: hidden; }
    .ring { position: absolute; width: 220px; height: 220px; border-radius: 50%; background: rgba(255,255,255,.18); }
    .art ion-icon { font-size: 110px; color: #fff; position: relative; }
    .chip { position: absolute; background: #fff; color: var(--nini-ink); font-weight: 700; font-size: 13px; padding: 8px 12px;
      border-radius: 99px; box-shadow: 0 6px 18px rgba(0,0,0,.12); }
    .c0 { top: 28px; left: 20px; } .c1 { top: 70px; right: 18px; } .c2 { bottom: 34px; left: 34px; }
    h1 { font-size: 29px; line-height: 1.15; margin: 0 0 12px; }
    p { font-size: 16.5px; line-height: 1.5; color: var(--nini-muted); margin: 0; }
    footer { padding: 0 24px; }
    .dots { display: flex; gap: 8px; justify-content: center; margin: 8px 0 18px; }
    .dots span { width: 8px; height: 8px; border-radius: 99px; background: var(--nini-line); transition: all .25s; cursor: pointer; }
    .dots span.on { width: 26px; background: var(--ion-color-primary); }
  `,
})
export class OnboardingPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly slides = viewChild.required<ElementRef<HTMLDivElement>>('slides');
  readonly index = signal(0);

  readonly items: Slide[] = [
    {
      icon: 'search',
      accent: 'linear-gradient(140deg, #e8762b, #f2a65a)',
      title: 'Trouvez un prestataire près de chez vous',
      text: 'Coiffure, couture, plomberie, électricité, mécanique… Les meilleurs prestataires de votre quartier, du plus proche au plus loin.',
      chips: ['✂️ Coiffure', '🔧 Plomberie', '📍 à 600 m'],
    },
    {
      icon: 'calendar',
      accent: 'linear-gradient(140deg, #1f9d6b, #5cc596)',
      title: 'Contactez ou réservez en un geste',
      text: 'Écrivez sur WhatsApp, appelez, ou réservez un créneau libre directement. Vous recevez un rappel la veille.',
      chips: ['💬 WhatsApp', '📅 Demain 10h', '⭐ 4,8'],
    },
    {
      icon: 'storefront',
      accent: 'linear-gradient(140deg, #3d5a80, #6b8cba)',
      title: 'Vous êtes prestataire ? Développez votre activité',
      text: 'Votre page, votre planning, vos rendez-vous et vos revenus en graphiques. Partagez vos disponibilités sur vos réseaux.',
      chips: ['📈 +24 % ce mois', '👥 12 clients', '🔗 Partager'],
    },
  ];

  onScroll() {
    const el = this.slides().nativeElement;
    this.index.set(Math.round(el.scrollLeft / el.clientWidth));
  }

  go(i: number) {
    const el = this.slides().nativeElement;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }

  next() {
    if (this.index() < this.items.length - 1) this.go(this.index() + 1);
    else void this.finish();
  }

  async finish() {
    await this.auth.finishOnboarding();
    await this.router.navigateByUrl('/bienvenue', { replaceUrl: true });
  }
}
