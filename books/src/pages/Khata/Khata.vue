<template>
  <div class="flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <PageHeader :title="t`Khata Book`" class="bg-white dark:bg-gray-875 border-b dark:border-gray-800">
      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
          :title="t`Refresh data`"
          @click="loadKhataData"
        >
          <feather-icon name="refresh-cw" class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
          <span>{{ t`Refresh` }}</span>
        </button>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-sm"
          @click="createNewParty"
        >
          <feather-icon name="plus" class="w-3.5 h-3.5" />
          <span>{{ t`New Party` }}</span>
        </button>
      </div>
    </PageHeader>

    <!-- Main Content Area -->
    <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scroll">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- To Collect -->
        <div class="bg-white dark:bg-gray-875 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div class="absolute top-0 start-0 w-1.5 h-full bg-emerald-500"></div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {{ t`To Collect (Receivables)` }}
            </span>
            <div class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <feather-icon name="arrow-down-left" class="w-4 h-4" />
            </div>
          </div>
          <div class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
            {{ formatCurrency(totalReceivables) }}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            {{ customerDuesCount }} {{ t`customer(s) have pending payments` }}
          </div>
        </div>

        <!-- To Pay -->
        <div class="bg-white dark:bg-gray-875 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div class="absolute top-0 start-0 w-1.5 h-full bg-amber-500"></div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {{ t`To Pay (Payables)` }}
            </span>
            <div class="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <feather-icon name="arrow-up-right" class="w-4 h-4" />
            </div>
          </div>
          <div class="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">
            {{ formatCurrency(totalPayables) }}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            {{ supplierDuesCount }} {{ t`supplier(s) to be paid` }}
          </div>
        </div>

        <!-- Net Position -->
        <div class="bg-white dark:bg-gray-875 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div
            class="absolute top-0 start-0 w-1.5 h-full"
            :class="netBalance >= 0 ? 'bg-blue-500' : 'bg-red-500'"
          ></div>
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {{ t`Net Position` }}
            </span>
            <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <feather-icon name="dollar-sign" class="w-4 h-4" />
            </div>
          </div>
          <div
            class="text-2xl font-extrabold mt-2"
            :class="netBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'"
          >
            {{ formatCurrency(netBalance) }}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            {{ netBalance >= 0 ? t`Net positive cash flow` : t`Net negative cash flow` }}
          </div>
        </div>
      </div>

      <!-- Controls & Filter Toolbar -->
      <div class="bg-white dark:bg-gray-875 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <!-- Search Input -->
        <div class="relative w-full md:w-80">
          <feather-icon name="search" class="w-4 h-4 text-gray-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="t`Search party by name or phone...`"
            class="w-full ps-9 pe-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-900 dark:text-gray-100"
          />
        </div>

        <!-- Role Tabs & Dues Toggle -->
        <div class="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div class="flex rounded-lg bg-gray-100 dark:bg-gray-900 p-1 text-xs font-medium">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              class="px-3 py-1.5 rounded-md transition-colors"
              :class="
                selectedTab === tab.value
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              "
              @click="selectedTab = tab.value"
            >
              {{ tab.label }}
            </button>
          </div>

          <label class="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer select-none">
            <input
              v-model="onlyWithDues"
              type="checkbox"
              class="rounded text-emerald-600 focus:ring-0 cursor-pointer"
            />
            <span>{{ t`Only with balance` }}</span>
          </label>
        </div>
      </div>

      <!-- Parties List / Ledger Cards -->
      <div v-if="loading" class="py-16 text-center text-gray-500">
        <feather-icon name="loader" class="w-8 h-8 mx-auto animate-spin text-emerald-600" />
        <p class="mt-2 text-sm">{{ t`Loading Khata records...` }}</p>
      </div>

      <div v-else-if="filteredParties.length === 0" class="py-16 text-center bg-white dark:bg-gray-875 rounded-xl border dark:border-gray-800">
        <feather-icon name="user-x" class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
        <h4 class="mt-3 font-semibold text-gray-800 dark:text-gray-200">{{ t`No parties match your criteria` }}</h4>
        <p class="text-sm text-gray-500 mt-1">{{ t`Try clearing your filters or create a new party.` }}</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="party in filteredParties"
          :key="party.name"
          class="bg-white dark:bg-gray-875 p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 shadow-sm transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <!-- Party Identity -->
          <div class="flex items-center gap-3.5">
            <!-- Initials Avatar -->
            <div
              class="w-11 h-11 rounded-full font-bold text-sm flex items-center justify-center text-white flex-shrink-0 shadow-sm"
              :class="getAvatarColor(party.name)"
            >
              {{ getInitials(party.name) }}
            </div>

            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-base text-gray-900 dark:text-gray-100">
                  {{ party.name }}
                </span>
                <span
                  class="text-xs px-2 py-0.5 rounded font-medium"
                  :class="
                    party.role === 'Customer'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                  "
                >
                  {{ party.role }}
                </span>
              </div>

              <!-- Contact & Details -->
              <div class="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span v-if="party.phone" class="flex items-center gap-1">
                  <feather-icon name="phone" class="w-3 h-3" />
                  {{ party.phone }}
                </span>
                <span v-if="party.email" class="flex items-center gap-1">
                  <feather-icon name="mail" class="w-3 h-3" />
                  {{ party.email }}
                </span>
                <span v-if="party.invoices.length > 0" class="text-amber-600 dark:text-amber-400 font-medium">
                  {{ party.invoices.length }} {{ t`pending invoice(s)` }}
                </span>
              </div>
            </div>
          </div>

          <!-- Balance & Actions -->
          <div class="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 dark:border-gray-800">
            <!-- Due Amount -->
            <div class="text-start md:text-end">
              <span class="text-xs uppercase font-medium text-gray-500">
                {{ party.role === 'Customer' ? t`To Collect` : t`To Pay` }}
              </span>
              <div
                class="text-lg font-bold"
                :class="
                  party.totalOutstanding > 0
                    ? (party.role === 'Customer' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400')
                    : 'text-gray-500'
                "
              >
                {{ formatCurrency(party.totalOutstanding) }}
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-2">
              <!-- WhatsApp Reminder Button -->
              <button
                v-if="party.role === 'Customer' && party.totalOutstanding > 0"
                class="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
                :title="t`Send WhatsApp Reminder`"
                @click="quickWhatsApp(party)"
              >
                <feather-icon name="message-circle" class="w-4 h-4" />
              </button>

              <!-- Invoices Breakdown Button -->
              <button
                class="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                @click="openInvoicesModal(party)"
              >
                {{ t`Invoices` }}
              </button>

              <!-- Record Payment Shortcut -->
              <button
                class="px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium hover:opacity-90 transition-opacity"
                @click="recordPayment(party)"
              >
                {{ t`Payment` }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Invoices Modal -->
    <PartyInvoicesModal
      :open-modal="showInvoicesModal"
      :party="selectedParty"
      :dark-mode="darkMode"
      @closemodal="showInvoicesModal = false"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import PageHeader from 'src/components/PageHeader.vue';
import PartyInvoicesModal, { KhataParty, KhataInvoice } from './PartyInvoicesModal.vue';
import { fyo } from 'src/initFyo';
import router from 'src/router';
import { showToast } from 'src/utils/interactive';

export default defineComponent({
  name: 'Khata',
  components: {
    PageHeader,
    PartyInvoicesModal,
  },
  props: {
    darkMode: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      loading: true,
      parties: [] as KhataParty[],
      searchQuery: '',
      selectedTab: 'all',
      onlyWithDues: true,
      showInvoicesModal: false,
      selectedParty: null as KhataParty | null,
      tabs: [
        { label: 'All', value: 'all' },
        { label: 'Customers', value: 'Customer' },
        { label: 'Suppliers', value: 'Supplier' },
      ],
    };
  },
  computed: {
    totalReceivables(): number {
      return this.parties
        .filter((p) => p.role === 'Customer' || p.role === 'Both')
        .reduce((sum, p) => sum + (p.totalOutstanding > 0 ? p.totalOutstanding : 0), 0);
    },
    totalPayables(): number {
      return this.parties
        .filter((p) => p.role === 'Supplier')
        .reduce((sum, p) => sum + (p.totalOutstanding > 0 ? p.totalOutstanding : 0), 0);
    },
    netBalance(): number {
      return this.totalReceivables - this.totalPayables;
    },
    customerDuesCount(): number {
      return this.parties.filter(
        (p) => (p.role === 'Customer' || p.role === 'Both') && p.totalOutstanding > 0
      ).length;
    },
    supplierDuesCount(): number {
      return this.parties.filter(
        (p) => p.role === 'Supplier' && p.totalOutstanding > 0
      ).length;
    },
    filteredParties(): KhataParty[] {
      return this.parties.filter((party) => {
        // Tab filter
        if (this.selectedTab !== 'all' && party.role !== this.selectedTab && party.role !== 'Both') {
          return false;
        }

        // Only with dues filter
        if (this.onlyWithDues && party.totalOutstanding <= 0) {
          return false;
        }

        // Search query filter
        if (this.searchQuery.trim()) {
          const q = this.searchQuery.toLowerCase();
          const nameMatch = party.name.toLowerCase().includes(q);
          const phoneMatch = party.phone ? party.phone.toLowerCase().includes(q) : false;
          return nameMatch || phoneMatch;
        }

        return true;
      });
    },
  },
  async mounted() {
    await this.loadKhataData();
  },
  methods: {
    formatCurrency(amount: number): string {
      try {
        return fyo.format(amount || 0, 'Currency');
      } catch {
        return `${amount || 0}`;
      }
    },
    getInitials(name: string): string {
      if (!name) return 'KP';
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    },
    getAvatarColor(name: string): string {
      const colors = [
        'bg-blue-600',
        'bg-emerald-600',
        'bg-indigo-600',
        'bg-purple-600',
        'bg-teal-600',
        'bg-rose-600',
        'bg-amber-600',
      ];
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return colors[Math.abs(hash) % colors.length];
    },
    async loadKhataData() {
      this.loading = true;
      try {
        // 1. Fetch parties
        const rawParties = (await fyo.db.getAllRaw('Party', {
          fields: ['name', 'role', 'phone', 'email'],
        })) as { name: string; role: 'Customer' | 'Supplier' | 'Both'; phone?: string; email?: string }[];

        // 2. Fetch pending sales invoices (Customers)
        const rawSalesInvoices = (await fyo.db.getAllRaw('SalesInvoice', {
          fields: ['name', 'party', 'date', 'dueDate', 'grandTotal', 'outstandingAmount'],
          filters: {
            submitted: true,
            cancelled: false,
          },
        })) as { name: string; party: string; date: string; dueDate?: string; grandTotal: number; outstandingAmount: number }[];

        // 3. Fetch pending purchase invoices (Suppliers)
        const rawPurchaseInvoices = (await fyo.db.getAllRaw('PurchaseInvoice', {
          fields: ['name', 'party', 'date', 'dueDate', 'grandTotal', 'outstandingAmount'],
          filters: {
            submitted: true,
            cancelled: false,
          },
        })) as { name: string; party: string; date: string; dueDate?: string; grandTotal: number; outstandingAmount: number }[];

        // Map invoices by party
        const salesByParty = new Map<string, KhataInvoice[]>();
        for (const inv of rawSalesInvoices) {
          if (inv.outstandingAmount > 0) {
            const list = salesByParty.get(inv.party) || [];
            list.push({ ...inv, schemaName: 'SalesInvoice' });
            salesByParty.set(inv.party, list);
          }
        }

        const purchaseByParty = new Map<string, KhataInvoice[]>();
        for (const inv of rawPurchaseInvoices) {
          if (inv.outstandingAmount > 0) {
            const list = purchaseByParty.get(inv.party) || [];
            list.push({ ...inv, schemaName: 'PurchaseInvoice' });
            purchaseByParty.set(inv.party, list);
          }
        }

        // Assemble Khata Party list
        this.parties = rawParties.map((p) => {
          let partyInvoices: KhataInvoice[] = [];
          if (p.role === 'Customer') {
            partyInvoices = salesByParty.get(p.name) || [];
          } else if (p.role === 'Supplier') {
            partyInvoices = purchaseByParty.get(p.name) || [];
          } else {
            // Both
            partyInvoices = [
              ...(salesByParty.get(p.name) || []),
              ...(purchaseByParty.get(p.name) || []),
            ];
          }

          const totalOutstanding = partyInvoices.reduce(
            (sum, inv) => sum + (inv.outstandingAmount || 0),
            0
          );

          return {
            name: p.name,
            role: p.role,
            phone: p.phone,
            email: p.email,
            totalOutstanding,
            invoices: partyInvoices,
          };
        });

        // Sort: highest outstanding first
        this.parties.sort((a, b) => b.totalOutstanding - a.totalOutstanding);
      } catch (err) {
        console.error('Failed to load Khata data', err);
      } finally {
        this.loading = false;
      }
    },
    openInvoicesModal(party: KhataParty) {
      this.selectedParty = party;
      this.showInvoicesModal = true;
    },
    quickWhatsApp(party: KhataParty) {
      this.selectedParty = party;
      this.showInvoicesModal = true;
    },
    recordPayment(party: KhataParty) {
      router.push({
        path: '/edit/Payment/new',
        query: { party: party.name },
      });
    },
    createNewParty() {
      router.push('/edit/Party/new');
    },
  },
});
</script>
