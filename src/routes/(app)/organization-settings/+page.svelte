<script lang="ts">
    import { enhance } from "$app/forms";
    import * as Card from "$lib/components/ui/card";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Select from "$lib/components/ui/select";
    import * as Alert from "$lib/components/ui/alert";
    import { Spinner } from "$lib/components/ui/spinner";
    import { Separator } from "$lib/components/ui/separator";
    import Settings from "@lucide/svelte/icons/settings";
    import Globe from "@lucide/svelte/icons/globe";
    import DollarSign from "@lucide/svelte/icons/dollar-sign";
    import Calendar from "@lucide/svelte/icons/calendar";
    import Clock from "@lucide/svelte/icons/clock";
    import MapPin from "@lucide/svelte/icons/map-pin";
    import Phone from "@lucide/svelte/icons/phone";
    import Mail from "@lucide/svelte/icons/mail";
    import FileText from "@lucide/svelte/icons/file-text";
    import CheckCircle2 from "@lucide/svelte/icons/check-circle-2";
    import Building2 from "@lucide/svelte/icons/building-2";
    import Plus from "@lucide/svelte/icons/plus";
    import Trash2 from "@lucide/svelte/icons/trash-2";
    import Save from "@lucide/svelte/icons/save";
    import Edit from "@lucide/svelte/icons/edit";
    import Percent from "@lucide/svelte/icons/percent";
    import Hash from "@lucide/svelte/icons/hash";
    import { Badge } from "$lib/components/ui/badge";
    import { toast } from "svelte-sonner";
    import * as m from "$lib/paraglide/messages.js";

    let { data, form } = $props() as any;

    // Form state
    let currency = $state("");
    let timezone = $state("");
    let dateFormat = $state("");
    let timeFormat = $state("");
    let language = $state("");
    let addressStreet = $state("");
    let addressCity = $state("");
    let addressState = $state("");
    let addressPostalCode = $state("");
    let addressCountry = $state("");
    let phone = $state("");
    let email = $state("");
    let taxIdentifiers = $state<Array<{ id?: string; type: string; value: string; label: string; taxRate: number | null }>>([]);
    let isSubmitting = $state(false);
    let isSubmittingTax = $state<string | null>(null);

    // Initialize from data
    $effect(() => {
        if (data.settings) {
            currency = data.settings.currency || "USD";
            timezone = data.settings.timezone || "UTC";
            dateFormat = data.settings.dateFormat || "YYYY-MM-DD";
            timeFormat = data.settings.timeFormat || "24h";
            language = data.settings.language || "en-US";
            addressStreet = data.settings.addressStreet || "";
            addressCity = data.settings.addressCity || "";
            addressState = data.settings.addressState || "";
            addressPostalCode = data.settings.addressPostalCode || "";
            addressCountry = data.settings.addressCountry || "";
            phone = data.settings.phone || "";
            email = data.settings.email || "";
            taxIdentifiers = (data.settings.taxIdentifiers || []).map((ti: any) => ({
                id: ti.id,
                type: ti.type,
                value: ti.value,
                label: ti.label,
                taxRate: ti.taxRate
            }));
        }
    });

    // Available tax identifier types
    const taxIdentifierTypes = [
        { value: "TAX_ID", label: "Tax ID", placeholder: "TAX-123456", description: "Generic tax identification number" },
        { value: "VAT", label: "VAT Number", placeholder: "VAT-123456789", description: "Value Added Tax (EU, UK, etc.)" },
        { value: "GST", label: "GST Number", placeholder: "GST-123456789", description: "Goods & Services Tax (Canada, India, etc.)" },
        { value: "HST", label: "HST Number", placeholder: "HST-123456789", description: "Harmonized Sales Tax (Canada)" },
        { value: "BUSINESS_NUMBER", label: "Business Number (BN)", placeholder: "123456789", description: "Canada Revenue Agency Business Number" },
        { value: "EIN", label: "EIN Number", placeholder: "12-3456789", description: "Employer Identification Number (US)" },
        { value: "ABN", label: "ABN Number", placeholder: "12 345 678 901", description: "Australian Business Number" },
    ];

    function addTaxIdentifier() {
        taxIdentifiers = [...taxIdentifiers, { type: "", value: "", label: "", taxRate: null }];
    }

    async function saveTaxIdentifier(index: number) {
        const identifier = taxIdentifiers[index];
        if (!identifier.type || !identifier.value || !identifier.label) {
            toast.error(m.fillAllRequiredFields());
            return;
        }

        isSubmittingTax = identifier.id || `new-${index}`;
        const formData = new FormData();
        formData.append('type', identifier.type);
        formData.append('value', identifier.value);
        formData.append('label', identifier.label);
        if (identifier.taxRate !== null) {
            formData.append('taxRate', identifier.taxRate.toString());
        }

        if (identifier.id) {
            formData.append('id', identifier.id);
            formData.append('action', 'updateTaxIdentifier');
        } else {
            formData.append('action', 'createTaxIdentifier');
        }

        try {
            const response = await fetch('?/createTaxIdentifier', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                toast.success(m.taxIdentifierSaved());
                // Reload page to get updated data
                window.location.reload();
            } else {
                toast.error(result.error || m.failedToSaveTaxIdentifier());
            }
        } catch (err) {
            toast.error(m.failedToSaveTaxIdentifier());
        } finally {
            isSubmittingTax = null;
        }
    }

    async function removeTaxIdentifier(index: number) {
        const identifier = taxIdentifiers[index];
        if (!identifier.id) {
            // If it's a new one, just remove from local state
            taxIdentifiers = taxIdentifiers.filter((_, i) => i !== index);
            return;
        }

        if (!confirm(m.removeTaxIdentifierConfirm())) {
            return;
        }

        isSubmittingTax = identifier.id;
        const formData = new FormData();
        formData.append('id', identifier.id);

        try {
            const response = await fetch('?/deleteTaxIdentifier', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                toast.success(m.taxIdentifierRemoved());
                window.location.reload();
            } else {
                toast.error(result.error || m.failedToRemoveTaxIdentifier());
            }
        } catch (err) {
            toast.error(m.failedToRemoveTaxIdentifier());
        } finally {
            isSubmittingTax = null;
        }
    }

    function updateTaxIdentifierType(index: number, type: string) {
        const selectedType = taxIdentifierTypes.find(t => t.value === type);
        if (selectedType) {
            taxIdentifiers[index] = {
                ...taxIdentifiers[index],
                type: selectedType.value,
                label: selectedType.label
            };
            taxIdentifiers = taxIdentifiers; // Trigger reactivity
        }
    }

    function getPlaceholderForType(type: string): string {
        return taxIdentifierTypes.find(t => t.value === type)?.placeholder || m.enterTaxIdentifier();
    }

    function getDescriptionForType(type: string): string {
        return taxIdentifierTypes.find(t => t.value === type)?.description || "";
    }

    function getAvailableTypes(index: number): typeof taxIdentifierTypes {
        // Filter out types that are already used (except the current one)
        const usedTypes = taxIdentifiers
            .map((ti, i) => i !== index ? ti.type : null)
            .filter(Boolean) as string[];
        return taxIdentifierTypes.filter(t => !usedTypes.includes(t.value));
    }

    $effect(() => {
        if (form?.success) {
            toast.success(m.settingsUpdatedSuccessfully());
            // Reload to get fresh data
            setTimeout(() => window.location.reload(), 500);
        } else if (form?.error) {
            toast.error(form.error);
        }
    });

    // Common timezones with labels
    const timezones = [
        { value: "UTC", label: "UTC (Coordinated Universal Time)" },
        { value: "America/New_York", label: "Eastern Time (ET)" },
        { value: "America/Chicago", label: "Central Time (CT)" },
        { value: "America/Denver", label: "Mountain Time (MT)" },
        { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
        { value: "Europe/London", label: "London (GMT/BST)" },
        { value: "Europe/Paris", label: "Paris (CET/CEST)" },
        { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
        { value: "Asia/Tokyo", label: "Tokyo (JST)" },
        { value: "Asia/Shanghai", label: "Shanghai (CST)" },
        { value: "Asia/Dubai", label: "Dubai (GST)" },
        { value: "Asia/Kolkata", label: "Mumbai (IST)" },
        { value: "Australia/Sydney", label: "Sydney (AEDT/AEST)" }
    ];

    // Common currencies with names
    const currencies = [
        { value: "USD", label: "USD - US Dollar" },
        { value: "EUR", label: "EUR - Euro" },
        { value: "GBP", label: "GBP - British Pound" },
        { value: "JPY", label: "JPY - Japanese Yen" },
        { value: "AUD", label: "AUD - Australian Dollar" },
        { value: "CAD", label: "CAD - Canadian Dollar" },
        { value: "CHF", label: "CHF - Swiss Franc" },
        { value: "CNY", label: "CNY - Chinese Yuan" },
        { value: "INR", label: "INR - Indian Rupee" },
        { value: "BRL", label: "BRL - Brazilian Real" }
    ];

    // Languages for document generation (not for user interface)
    const languages = [
        { value: "en-US", label: "English" },
        { value: "fr-FR", label: "Français" },
        { value: "ar-SA", label: "العربية" }
    ];

    // Date format labels
    const dateFormatLabels: Record<string, string> = {
        "MM/DD/YYYY": "MM/DD/YYYY (e.g., 01/15/2024)",
        "DD/MM/YYYY": "DD/MM/YYYY (e.g., 15/01/2024)",
        "YYYY-MM-DD": "YYYY-MM-DD (e.g., 2024-01-15)",
        "DD.MM.YYYY": "DD.MM.YYYY (e.g., 15.01.2024)"
    };

</script>

<svelte:head>
    <title>{m.organizationSettings()} | SvelterApp</title>
</svelte:head>

<div class="space-y-6 pb-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
                <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                    <Settings class="h-5 w-5 text-primary" />
                </div>
                {m.organizationSettings()}
            </h1>
            <p class="text-muted-foreground mt-1.5">
                {m.configureOrganizationSubtitle()}
            </p>
        </div>
    </div>

    {#if form?.error}
        <Alert.Root variant="destructive" class="border-destructive/50">
            <Alert.Title>{m.error()}</Alert.Title>
            <Alert.Description>{form.error}</Alert.Description>
        </Alert.Root>
    {/if}

    {#if form?.success}
        <Alert.Root variant="default" class="border-green-500/50 bg-green-500/10">
            <CheckCircle2 class="h-4 w-4 text-green-600" />
            <Alert.Title class="text-green-700 dark:text-green-400">{m.success()}</Alert.Title>
            <Alert.Description class="text-green-600 dark:text-green-300">
                {m.settingsUpdatedSuccessfully()}
            </Alert.Description>
        </Alert.Root>
    {/if}

    {#if data.canManage}
        <form
            method="POST"
            action="?/update"
            use:enhance={() => {
                isSubmitting = true;
                return async ({ update }) => {
                    await update();
                    isSubmitting = false;
                };
            }}
            class="space-y-6"
        >
            <!-- Localization Settings -->
            <Card.Root class="border-2">
                <Card.Header class="pb-6">
                    <div class="flex items-center gap-3">
                        <div class="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-500/10">
                            <Globe class="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <Card.Title class="text-xl">{m.localizationRegionalSettings()}</Card.Title>
                            <Card.Description class="mt-1.5 text-sm">
                                {m.configureLocalizationSubtitle()}
                            </Card.Description>
                        </div>
                    </div>
                </Card.Header>
                <Card.Content class="space-y-8 px-6 pb-8">
                    <!-- Financial & Regional Settings -->
                    <div class="space-y-6">
                        <div>
                            <h3 class="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                <DollarSign class="h-4 w-4 text-muted-foreground" />
                                {m.financialRegional()}
                            </h3>
                            <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                <!-- Currency -->
                                <div class="space-y-3">
                                    <Label for="currency" class="text-sm font-medium">
                                        {m.currency()}
                                    </Label>
                                    <Select.Root
                                        type="single"
                                        value={currency}
                                        onValueChange={(value) => {
                                            if (value) currency = value;
                                        }}
                                    >
                                        <Select.Trigger id="currency" class="h-11 w-full">
                                            {currencies.find(c => c.value === currency)?.label || m.selectCurrency()}
                                        </Select.Trigger>
                                        <Select.Content>
                                            {#each currencies as curr}
                                                <Select.Item value={curr.value}>{curr.label}</Select.Item>
                                            {/each}
                                        </Select.Content>
                                    </Select.Root>
                                    <input type="hidden" name="currency" value={currency} />
                                    <p class="text-xs text-muted-foreground leading-relaxed">
                                        {m.usedForFinancial()}
                                    </p>
                                </div>

                                <!-- Timezone -->
                                <div class="space-y-3">
                                    <Label for="timezone" class="text-sm font-medium">
                                        {m.timezone()}
                                    </Label>
                                    <Select.Root
                                        type="single"
                                        value={timezone}
                                        onValueChange={(value) => {
                                            if (value) timezone = value;
                                        }}
                                    >
                                        <Select.Trigger id="timezone" class="h-11 w-full">
                                            {timezones.find(tz => tz.value === timezone)?.label || m.selectTimezone()}
                                        </Select.Trigger>
                                        <Select.Content>
                                            {#each timezones as tz}
                                                <Select.Item value={tz.value}>{tz.label}</Select.Item>
                                            {/each}
                                        </Select.Content>
                                    </Select.Root>
                                    <input type="hidden" name="timezone" value={timezone} />
                                    <p class="text-xs text-muted-foreground leading-relaxed">
                                        {m.allTimestampsTimezone()}
                                    </p>
                                </div>

                                <!-- Language for Documents -->
                                <div class="space-y-3">
                                    <Label for="language" class="text-sm font-medium">
                                        {m.language()} ({m.forDocuments()})
                                    </Label>
                                    <Select.Root
                                        type="single"
                                        value={language}
                                        onValueChange={(value) => {
                                            if (value) language = value;
                                        }}
                                    >
                                        <Select.Trigger id="language" class="h-11 w-full">
                                            {languages.find(lang => lang.value === language)?.label || m.selectLanguage()}
                                        </Select.Trigger>
                                        <Select.Content>
                                            {#each languages as lang}
                                                <Select.Item value={lang.value}>{lang.label}</Select.Item>
                                            {/each}
                                        </Select.Content>
                                    </Select.Root>
                                    <input type="hidden" name="language" value={language} />
                                    <p class="text-xs text-muted-foreground leading-relaxed">
                                        {m.languageForDocumentsDescription()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Separator class="my-2" />

                        <!-- Date & Time Format Settings -->
                        <div>
                            <h3 class="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                <Calendar class="h-4 w-4 text-muted-foreground" />
                                {m.dateTimeFormat()}
                            </h3>
                            <div class="grid gap-6 md:grid-cols-2">
                                <!-- Date Format -->
                                <div class="space-y-3">
                                    <Label for="dateFormat" class="text-sm font-medium">
                                        {m.dateFormat()}
                                    </Label>
                                    <Select.Root
                                        type="single"
                                        value={dateFormat}
                                        onValueChange={(value) => {
                                            if (value) dateFormat = value;
                                        }}
                                    >
                                        <Select.Trigger id="dateFormat" class="h-11 w-full">
                                            {dateFormatLabels[dateFormat] || dateFormat || m.selectDateFormat()}
                                        </Select.Trigger>
                                        <Select.Content>
                                            {#each data.dateFormats as format}
                                                <Select.Item value={format}>
                                                    {dateFormatLabels[format] || format}
                                                </Select.Item>
                                            {/each}
                                        </Select.Content>
                                    </Select.Root>
                                    <input type="hidden" name="dateFormat" value={dateFormat} />
                                    <p class="text-xs text-muted-foreground leading-relaxed">
                                        {m.howDatesDisplayed()}
                                    </p>
                                </div>

                                <!-- Time Format -->
                                <div class="space-y-3">
                                    <Label for="timeFormat" class="text-sm font-medium">
                                        {m.timeFormat()}
                                    </Label>
                                    <Select.Root
                                        type="single"
                                        value={timeFormat}
                                        onValueChange={(value) => {
                                            if (value) timeFormat = value;
                                        }}
                                    >
                                        <Select.Trigger id="timeFormat" class="h-11 w-full">
                                            {timeFormat === "12h" ? m.twelveHour() : timeFormat === "24h" ? m.twentyFourHour() : m.selectTimeFormat()}
                                        </Select.Trigger>
                                        <Select.Content>
                                            {#each data.timeFormats as format}
                                                <Select.Item value={format}>
                                                    {format === "12h" ? m.twelveHour() : m.twentyFourHour()}
                                                </Select.Item>
                                            {/each}
                                        </Select.Content>
                                    </Select.Root>
                                    <input type="hidden" name="timeFormat" value={timeFormat} />
                                    <p class="text-xs text-muted-foreground leading-relaxed">
                                        {m.chooseTimeFormat()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card.Content>
            </Card.Root>

            <!-- Address Information -->
            <Card.Root class="border-2">
                <Card.Header class="pb-4">
                    <div class="flex items-center gap-3">
                        <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/10">
                            <MapPin class="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <Card.Title class="text-xl">{m.addressInformation()}</Card.Title>
                            <Card.Description class="mt-1">
                                {m.organizationAddressSubtitle()}
                            </Card.Description>
                        </div>
                    </div>
                </Card.Header>
                <Card.Content class="space-y-4">
                    <div class="space-y-2">
                        <Label for="addressStreet" class="text-sm font-semibold">
                            {m.streetAddress()}
                        </Label>
                        <Input
                            id="addressStreet"
                            name="addressStreet"
                            placeholder="123 Main Street, Suite 100"
                            bind:value={addressStreet}
                            disabled={isSubmitting}
                            class="h-11"
                        />
                    </div>

                    <div class="grid gap-4 md:grid-cols-2">
                        <div class="space-y-2">
                            <Label for="addressCity" class="text-sm font-semibold">{m.city()}</Label>
                            <Input
                                id="addressCity"
                                name="addressCity"
                                placeholder="New York"
                                bind:value={addressCity}
                                disabled={isSubmitting}
                                class="h-11"
                            />
                        </div>

                        <div class="space-y-2">
                            <Label for="addressState" class="text-sm font-semibold">{m.stateProvince()}</Label>
                            <Input
                                id="addressState"
                                name="addressState"
                                placeholder="NY"
                                bind:value={addressState}
                                disabled={isSubmitting}
                                class="h-11"
                            />
                        </div>

                        <div class="space-y-2">
                            <Label for="addressPostalCode" class="text-sm font-semibold">{m.postalCode()}</Label>
                            <Input
                                id="addressPostalCode"
                                name="addressPostalCode"
                                placeholder="10001"
                                bind:value={addressPostalCode}
                                disabled={isSubmitting}
                                class="h-11"
                            />
                        </div>

                        <div class="space-y-2">
                            <Label for="addressCountry" class="text-sm font-semibold">{m.country()}</Label>
                            <Input
                                id="addressCountry"
                                name="addressCountry"
                                placeholder="United States"
                                bind:value={addressCountry}
                                disabled={isSubmitting}
                                class="h-11"
                            />
                        </div>
                    </div>
                </Card.Content>
            </Card.Root>

            <!-- Contact Information -->
            <Card.Root class="border-2">
                <Card.Header class="pb-4">
                    <div class="flex items-center gap-3">
                        <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/10">
                            <Building2 class="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <Card.Title class="text-xl">{m.contactInformation()}</Card.Title>
                            <Card.Description class="mt-1">
                                {m.organizationContactSubtitle()}
                            </Card.Description>
                        </div>
                    </div>
                </Card.Header>
                <Card.Content class="space-y-4">
                    <div class="grid gap-4 md:grid-cols-2">
                        <div class="space-y-2">
                            <Label for="phone" class="text-sm font-semibold flex items-center gap-2">
                                <Phone class="h-4 w-4 text-muted-foreground" />
                                {m.phoneNumber()}
                            </Label>
                            <Input
                                id="phone"
                                name="phone"
                                type="tel"
                                placeholder="+1 (555) 123-4567"
                                bind:value={phone}
                                disabled={isSubmitting}
                                class="h-11"
                            />
                        </div>

                        <div class="space-y-2">
                            <Label for="email" class="text-sm font-semibold flex items-center gap-2">
                                <Mail class="h-4 w-4 text-muted-foreground" />
                                {m.emailAddress()}
                            </Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="contact@example.com"
                                bind:value={email}
                                disabled={isSubmitting}
                                class="h-11"
                            />
                        </div>

                    </div>

                    <!-- Tax Identifiers Section -->
                    <Separator class="my-8" />
                    <div class="space-y-6">
                        <div class="flex items-start justify-between gap-4">
                            <div class="space-y-2 flex-1">
                                <div class="flex items-center gap-3">
                                    <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10">
                                        <FileText class="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div>
                                        <h4 class="text-base font-semibold text-foreground">{m.taxIdentifiers()}</h4>
                                        <p class="text-xs text-muted-foreground mt-0.5">
                                            {m.manageTaxIdentifiersSubtitle()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onclick={addTaxIdentifier}
                                disabled={isSubmitting || taxIdentifiers.length >= taxIdentifierTypes.length}
                                class="h-9 shrink-0"
                            >
                                <Plus class="h-4 w-4 mr-1.5" />
                                {m.addIdentifier()}
                            </Button>
                        </div>
                        
                        {#if taxIdentifiers.length === 0}
                            <div class="relative overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/25 bg-gradient-to-br from-muted/30 to-muted/10 p-12">
                                <div class="flex flex-col items-center gap-4 text-center">
                                    <div class="flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 ring-4 ring-amber-500/5">
                                        <FileText class="h-8 w-8 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div class="space-y-1.5">
                                        <p class="text-sm font-semibold text-foreground">{m.noTaxIdentifiersConfigured()}</p>
                                        <p class="text-xs text-muted-foreground max-w-sm">
                                            {m.addTaxIdentifiersDescription()}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onclick={addTaxIdentifier}
                                        disabled={isSubmitting}
                                        class="mt-2"
                                    >
                                        <Plus class="h-3.5 w-3.5 mr-1.5" />
                                        {m.addFirstIdentifier()}
                                    </Button>
                                </div>
                            </div>
                        {:else}
                            <div class="space-y-4">
                                {#each taxIdentifiers as identifier, index}
                                    <div class="group relative overflow-hidden rounded-xl border transition-all duration-200 {
                                        identifier.id 
                                            ? 'border-border bg-card shadow-sm hover:shadow-md hover:border-primary/30' 
                                            : 'border-dashed border-primary/40 bg-gradient-to-br from-primary/5 to-primary/10/50 shadow-sm'
                                    }">
                                        <!-- Status Badge -->
                                        {#if identifier.id}
                                            <div class="absolute top-3 right-3 z-10">
                                                <Badge variant="secondary" class="text-xs font-medium px-2 py-0.5 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                                                    <CheckCircle2 class="h-3 w-3 mr-1" />
                                                    {m.saved()}
                                                </Badge>
                                            </div>
                                        {:else}
                                            <div class="absolute top-3 right-3 z-10">
                                                <Badge variant="outline" class="text-xs font-medium px-2 py-0.5 border-primary/30 text-primary">
                                                    {m.draft()}
                                                </Badge>
                                            </div>
                                        {/if}
                                        
                                        <div class="p-6 space-y-5">
                                            <!-- Header with Type -->
                                            <div class="flex items-start gap-4">
                                                <div class="flex items-center justify-center w-12 h-12 rounded-lg bg-amber-500/10 shrink-0">
                                                    <Hash class="h-6 w-6 text-amber-600 dark:text-amber-400" />
                                                </div>
                                                <div class="flex-1 min-w-0">
                                                    <div class="space-y-4">
                                                        <!-- Type Selection -->
                                                        <div class="space-y-2">
                                                            <Label for="tax-type-{index}" class="text-sm font-semibold flex items-center gap-1.5">
                                                                {m.taxIdentifierType()}
                                                                <span class="text-destructive text-xs">*</span>
                                                            </Label>
                                                            <Select.Root
                                                                type="single"
                                                                value={identifier.type}
                                                                onValueChange={(value) => {
                                                                    if (value) updateTaxIdentifierType(index, value);
                                                                }}
                                                            >
                                                                <Select.Trigger id="tax-type-{index}" class="h-11 w-full bg-background">
                                                                    {identifier.label || m.selectType()}
                                                                </Select.Trigger>
                                                                <Select.Content>
                                                                    {#each getAvailableTypes(index) as typeOption}
                                                                        <Select.Item value={typeOption.value}>
                                                                            <span class="flex items-center gap-2">
                                                                                <FileText class="h-3.5 w-3.5" />
                                                                                {typeOption.label}
                                                                            </span>
                                                                        </Select.Item>
                                                                    {/each}
                                                                </Select.Content>
                                                            </Select.Root>
                                                            {#if identifier.type}
                                                                <p class="text-xs text-muted-foreground leading-relaxed pl-1">
                                                                    {getDescriptionForType(identifier.type)}
                                                                </p>
                                                            {/if}
                                                        </div>
                                                        
                                                        <!-- Value and Rate Grid -->
                                                        <div class="grid gap-4 md:grid-cols-2">
                                                            <!-- Identifier Value -->
                                                            <div class="space-y-2">
                                                                <Label for="tax-value-{index}" class="text-sm font-semibold flex items-center gap-1.5">
                                                                    <Hash class="h-3.5 w-3.5 text-muted-foreground" />
                                                                    {m.identifierNumber()}
                                                                    <span class="text-destructive text-xs">*</span>
                                                                </Label>
                                                                <Input
                                                                    id="tax-value-{index}"
                                                                    placeholder={getPlaceholderForType(identifier.type) || m.enterTaxIdentifier()}
                                                                    value={identifier.value}
                                                                    oninput={(e) => {
                                                                        taxIdentifiers[index].value = e.currentTarget.value;
                                                                        taxIdentifiers = taxIdentifiers; // Trigger reactivity
                                                                    }}
                                                                    disabled={isSubmitting || !identifier.type}
                                                                    class="h-11 font-mono text-sm"
                                                                />
                                                            </div>
                                                            
                                                            <!-- Tax Rate -->
                                                            <div class="space-y-2">
                                                                <Label for="tax-rate-{index}" class="text-sm font-semibold flex items-center gap-1.5">
                                                                    <Percent class="h-3.5 w-3.5 text-muted-foreground" />
                                                                    {m.taxRate()}
                                                                    <span class="text-xs text-muted-foreground font-normal">{m.optional()}</span>
                                                                </Label>
                                                                <div class="relative">
                                                                    <Input
                                                                        id="tax-rate-{index}"
                                                                        type="number"
                                                                        step="0.01"
                                                                        min="0"
                                                                        max="100"
                                                                        placeholder="0.00"
                                                                        value={identifier.taxRate?.toString() || ""}
                                                                        oninput={(e) => {
                                                                            const val = e.currentTarget.value;
                                                                            taxIdentifiers[index].taxRate = val ? parseFloat(val) : null;
                                                                            taxIdentifiers = taxIdentifiers; // Trigger reactivity
                                                                        }}
                                                                        disabled={isSubmitting || !identifier.type}
                                                                        class="h-11 pr-10 font-mono text-sm"
                                                                    />
                                                                    <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground pointer-events-none">
                                                                        <Percent class="h-3.5 w-3.5" />
                                                                    </div>
                                                                </div>
                                                                <p class="text-xs text-muted-foreground leading-relaxed pl-1">
                                                                    {m.taxPercentageUsed()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <!-- Action Buttons -->
                                            <div class="flex items-center justify-end gap-2 pt-2 border-t">
                                                {#if identifier.type && identifier.value}
                                                    <form
                                                        method="POST"
                                                        action={identifier.id ? "?/updateTaxIdentifier" : "?/createTaxIdentifier"}
                                                        use:enhance={() => {
                                                            isSubmittingTax = identifier.id || `new-${index}`;
                                                            return async ({ update, result }) => {
                                                                await update();
                                                                if (result.type === 'success' && result.data?.success) {
                                                                    toast.success(identifier.id ? m.taxIdentifierUpdated() : m.taxIdentifierAdded());
                                                                    setTimeout(() => window.location.reload(), 300);
                                                                } else if (result.type === 'failure') {
                                                                    const errorMsg = typeof result.data === 'object' && result.data && 'error' in result.data 
                                                                        ? String(result.data.error) 
                                                                        : m.failedToSaveTaxIdentifier();
                                                                    toast.error(errorMsg);
                                                                }
                                                                isSubmittingTax = null;
                                                            };
                                                        }}
                                                    >
                                                        <input type="hidden" name="type" value={identifier.type} />
                                                        <input type="hidden" name="value" value={identifier.value} />
                                                        <input type="hidden" name="label" value={identifier.label} />
                                                        {#if identifier.taxRate !== null && identifier.taxRate !== undefined}
                                                            <input type="hidden" name="taxRate" value={identifier.taxRate.toString()} />
                                                        {/if}
                                                        {#if identifier.id}
                                                            <input type="hidden" name="id" value={identifier.id} />
                                                        {/if}
                                                        <Button
                                                            type="submit"
                                                            variant={identifier.id ? "outline" : "default"}
                                                            size="sm"
                                                            disabled={isSubmitting || isSubmittingTax === (identifier.id || `new-${index}`)}
                                                            class="h-9 min-w-[100px]"
                                                        >
                                                            {#if isSubmittingTax === (identifier.id || `new-${index}`)}
                                                                <Spinner class="h-3.5 w-3.5 mr-1.5" />
                                                                {identifier.id ? m.updating() : m.saving()}
                                                            {:else}
                                                                {#if identifier.id}
                                                                    <Edit class="h-3.5 w-3.5 mr-1.5" />
                                                                {:else}
                                                                    <Save class="h-3.5 w-3.5 mr-1.5" />
                                                                {/if}
                                                                {identifier.id ? m.update() : m.save()}
                                                            {/if}
                                                        </Button>
                                                    </form>
                                                {/if}
                                                
                                                <form
                                                    method="POST"
                                                    action="?/deleteTaxIdentifier"
                                                    use:enhance={() => {
                                                        if (!confirm(m.removeTaxIdentifierConfirmWithLabel({ label: identifier.label || m.taxIdentifierLabel() }))) {
                                                            return () => {};
                                                        }
                                                        isSubmittingTax = identifier.id || `new-${index}`;
                                                        return async ({ update, result }) => {
                                                            await update();
                                                            if (result.type === 'success' && result.data?.success) {
                                                                toast.success(m.taxIdentifierRemoved());
                                                                setTimeout(() => window.location.reload(), 300);
                                                            } else if (result.type === 'failure') {
                                                                const errorMsg = typeof result.data === 'object' && result.data && 'error' in result.data 
                                                                    ? String(result.data.error) 
                                                                    : m.failedToRemoveTaxIdentifier();
                                                                toast.error(errorMsg);
                                                            }
                                                            isSubmittingTax = null;
                                                        };
                                                    }}
                                                >
                                                    {#if identifier.id}
                                                        <input type="hidden" name="id" value={identifier.id} />
                                                    {/if}
                                                    <Button
                                                        type={identifier.id ? "submit" : "button"}
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={isSubmitting || isSubmittingTax === (identifier.id || `new-${index}`)}
                                                        onclick={() => {
                                                            if (!identifier.id) {
                                                                taxIdentifiers = taxIdentifiers.filter((_, i) => i !== index);
                                                                toast.info(m.removedFromForm());
                                                            }
                                                        }}
                                                        class="h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        title={m.removeTaxIdentifierTitle()}
                                                    >
                                                        {#if isSubmittingTax === (identifier.id || `new-${index}`)}
                                                            <Spinner class="h-3.5 w-3.5 mr-1.5" />
                                                            {m.removing()}
                                                        {:else}
                                                            <Trash2 class="h-3.5 w-3.5 mr-1.5" />
                                                            {m.remove()}
                                                        {/if}
                                                    </Button>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                </Card.Content>
            </Card.Root>

            <!-- Submit Button -->
            <div class="flex justify-end gap-3 pt-4 border-t">
                <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onclick={() => {
                        // Reset form to original values
                        if (data.settings) {
                            currency = data.settings.currency || "USD";
                            timezone = data.settings.timezone || "UTC";
                            dateFormat = data.settings.dateFormat || "YYYY-MM-DD";
                            timeFormat = data.settings.timeFormat || "24h";
                            language = data.settings.language || "en-US";
                            addressStreet = data.settings.addressStreet || "";
                            addressCity = data.settings.addressCity || "";
                            addressState = data.settings.addressState || "";
                            addressPostalCode = data.settings.addressPostalCode || "";
                            addressCountry = data.settings.addressCountry || "";
                            phone = data.settings.phone || "";
                            email = data.settings.email || "";
                        }
                    }}
                >
                    {m.reset()}
                </Button>
                <Button type="submit" disabled={isSubmitting || !data.canManage} size="lg" class="min-w-[140px]">
                    {#if isSubmitting}
                        <Spinner class="mr-2 h-4 w-4" />
                        {m.saving()}
                    {:else}
                        <Settings class="mr-2 h-4 w-4" />
                        {m.saveSettings()}
                    {/if}
                </Button>
            </div>
        </form>
    {:else}
        <!-- Read-only view -->
        <Card.Root class="border-2">
            <Card.Header>
                <div class="flex items-center gap-3">
                    <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                        <Settings class="h-5 w-5" />
                    </div>
                    <div>
                        <Card.Title>{m.organizationSettings()}</Card.Title>
                        <Card.Description>
                            {m.noPermissionToEdit()}
                        </Card.Description>
                    </div>
                </div>
            </Card.Header>
            <Card.Content class="space-y-6">
                {#if data.settings}
                    <div class="grid gap-6 md:grid-cols-2">
                        <div class="space-y-1">
                            <p class="text-sm font-semibold text-muted-foreground">{m.currency()}</p>
                            <p class="text-base">{data.settings.currency}</p>
                        </div>
                        <div class="space-y-1">
                            <p class="text-sm font-semibold text-muted-foreground">{m.timezone()}</p>
                            <p class="text-base">{data.settings.timezone}</p>
                        </div>
                        <div class="space-y-1">
                            <p class="text-sm font-semibold text-muted-foreground">{m.dateFormat()}</p>
                            <p class="text-base">{data.settings.dateFormat}</p>
                        </div>
                        <div class="space-y-1">
                            <p class="text-sm font-semibold text-muted-foreground">{m.timeFormat()}</p>
                            <p class="text-base">{data.settings.timeFormat === "12h" ? m.twelveHour() : m.twentyFourHour()}</p>
                        </div>
                        <div class="space-y-1 md:col-span-2">
                            <p class="text-sm font-semibold text-muted-foreground">{m.language()}</p>
                            <p class="text-base">{data.settings.language}</p>
                        </div>
                    </div>
                {:else}
                    <p class="text-sm text-muted-foreground">{m.noSettingsConfigured()}</p>
                {/if}
            </Card.Content>
        </Card.Root>
    {/if}
</div>
