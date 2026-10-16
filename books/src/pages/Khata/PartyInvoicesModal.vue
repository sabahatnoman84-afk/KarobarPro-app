<template>
  <Modal :open-modal="openModal" class="w-full max-w-2xl" @closemodal="$emit('closemodal')">
    <div class="p-6">
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-4 border-b dark:border-gray-800">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">
              {{ party?.name }}
            </h2>
            <span
              class="text-xs px-2 py-0.5 rounded-full font-medium"
              :class="
                party?.role === 'Customer'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
              "
            >
              {{ party?.role }}
            </span>
          </div>
          <div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span v-if="party?.phone" class="flex items-center gap-1">
              <feather-icon name="phone" class="w-3 h-3" />
              {{ party.phone }}
            </span>
            <span v-if="party?.email" class="flex items-center gap-1">
              <feather-icon name="mail" class="w-3 h-3" />
              {{ party.email }}
            </span>
          </div>
        </div>

        <button
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded"
          @click="$emit('closemodal')"
        >
          <feather-icon name="x" class="w-5 h-5" />
        </button>
      </div>

      <!-- Outstanding Summary Box -->
      <div
        class="my-4 p-4 rounded-lg flex items-center justify-between"
        :class="
          party?.role === 'Customer'
            ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50'
            : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50'
        "
      >
        <div>
          <span class="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
            {{ party?.role === 'Customer' ? t`Total to Collect (Due)` : t`Total to Pay (Owed)` }}
          </span>
          <div
            class="text-2xl font-bold mt-0.5"
            :class="party?.role === 'Customer' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'"
          >
            {{ formatCurrency(party?.totalOutstanding || 0) }}
          </div>
        </div>

        <!-- WhatsApp Reminder Button for Customers -->
        <button
          v-if="party?.role === 'Customer' && party?.totalOutstanding > 0"
          class="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium shadow-sm transition-colors"
          :title="party?.phone ? t`Send reminder via WhatsApp` : t`No phone number available`"
          @click="sendWhatsAppReminder"
        >
          <feather-icon name="message-circle" class="w-4 h-4" />
          <span>{{ t`WhatsApp Reminder` }}</span>
        </button>
      </div>

      <!-- Invoices List -->
      <div class="mt-4">
        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {{ t`Pending Invoices` }} ({{ party?.invoices?.length || 0 }})
        </h3>

        <div v-if="!party?.invoices || party.invoices.length === 0" class="py-8 text-center text-sm text-gray-500">
          {{ t`No pending invoices found for this party.` }}
        </div>

        <div
          v-else
          class="max-h-64 overflow-y-auto space-y-2 pe-1 custom-scroll"
        >
          <div
            v-for="inv in party.invoices"
            :key="inv.name"
            class="p-3 border dark:border-gray-800 rounded flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
            @click="openInvoice(inv)"
          >
            <div>
              <div class="flex items-center gap-2">
                <span class="font-medium text-sm text-gray-900 dark:text-gray-100">
                  {{ inv.name }}
                </span>
                <span class="text-xs text-gray-500">
                  {{ formatDate(inv.date) }}
                </span>
              </div>
              <div class="text-xs text-gray-500 mt-0.5">
                {{ t`Invoice Total` }}: {{ formatCurrency(inv.grandTotal) }}
              </div>
            </div>

            <div class="text-end">
              <div class="text-sm font-bold text-red-600 dark:text-red-400">
                {{ formatCurrency(inv.outstandingAmount) }}
              </div>
              <span class="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                {{ t`View Invoice` }} &rarr;
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- WhatsApp Preview -->
      <div v-if="party?.role === 'Customer' && party?.totalOutstanding > 0" class="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded border dark:border-gray-800 text-xs">
        <div class="text-gray-500 font-medium mb-1">{{ t`WhatsApp Message Preview` }}:</div>
        <p class="text-gray-700 dark:text-gray-300 whitespace-pre-line italic">
          "{{ reminderMessagePreview }}"
        </p>
      </div>

      <!-- Modal Footer -->
      <div class="mt-6 pt-4 border-t dark:border-gray-800 flex justify-end gap-2">
        <button
          class="px-4 py-2 border dark:border-gray-700 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          @click="$emit('closemodal')"
        >
          {{ t`Close` }}
        </button>
      </div>
    </div>
  </Modal>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import Modal from 'src/components/Modal.vue';
import { fyo } from 'src/initFyo';
import router from 'src/router';
import { showToast } from 'src/utils/interactive';

export interface KhataInvoice {
  name: string;
  party: string;
  date: string;
  dueDate?: string;
  grandTotal: number;
  outstandingAmount: number;
  schemaName: 'SalesInvoice' | 'PurchaseInvoice';
}

export interface KhataParty {
  name: string;
  role: 'Customer' | 'Supplier' | 'Both';
  phone?: string;
  email?: string;
  totalOutstanding: number;
  invoices: KhataInvoice[];
}

export default defineComponent({
  name: 'PartyInvoicesModal',
  components: {
    Modal,
  },
  props: {
    openModal: {
      type: Boolean,
      default: false,
    },
    party: {
      type: Object as PropType<KhataParty | null>,
      default: null,
    },
    darkMode: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['closemodal'],
  computed: {
    companyName(): string {
      return (fyo.singles.AccountingSettings?.companyName as string) || 'KarobarPro Store';
    },
    reminderMessagePreview(): string {
      if (!this.party) return '';
      const formattedTotal = this.formatCurrency(this.party.totalOutstanding);
      const invoiceList = (this.party.invoices || [])
        .map((inv) => `${inv.name} (${this.formatCurrency(inv.outstandingAmount)})`)
        .slice(0, 3)
        .join(', ');

      const moreCount = (this.party.invoices || []).length - 3;
      const moreText = moreCount > 0 ? ` and ${moreCount} other(s)` : '';

      return `Dear ${this.party.name}, greetings from ${this.companyName}! This is a gentle reminder that an outstanding amount of ${formattedTotal} is pending against invoice(s): ${invoiceList}${moreText}. Kindly arrange the payment at your earliest convenience. Thank you!`;
    },
  },
  methods: {
    formatCurrency(amount: number): string {
      try {
        return fyo.format(amount || 0, 'Currency');
      } catch {
        return `${amount || 0}`;
      }
    },
    formatDate(dateStr: string): string {
      if (!dateStr) return '';
      try {
        const d = new Date(dateStr);
        return d.toLocaleDateString();
      } catch {
        return dateStr;
      }
    },
    openInvoice(invoice: KhataInvoice) {
      this.$emit('closemodal');
      router.push(`/edit/${invoice.schemaName}/${invoice.name}`);
    },
    sendWhatsAppReminder() {
      if (!this.party?.phone) {
        showToast({
          title: this.t`Phone number missing`,
          detail: this.t`Please add a phone number for this customer to send WhatsApp messages.`,
          type: 'error',
        });
        return;
      }

      // Strip non-digits from phone number
      let cleanPhone = this.party.phone.replace(/[^0-9]/g, '');
      // If 10 digits without country code, default to India/standard 91 or leave as is if already has country code
      if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
      }

      const encodedText = encodeURIComponent(this.reminderMessagePreview);
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

      if ((window as any).ipc?.openExternalUrl) {
        (window as any).ipc.openExternalUrl(waUrl);
      } else {
        window.open(waUrl, '_blank');
      }

      showToast({
        title: this.t`WhatsApp Reminder Opened`,
        detail: this.t`WhatsApp link generated for ${this.party.name}.`,
        type: 'success',
      });
    },
  },
});
</script>
