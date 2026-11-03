defmodule AdapticsWeb.EconLive.CityModels do
  @moduledoc """
  City model definitions for visual econometric modeling.

  Each model defines actors, contracts, and relationships that can be
  visualized as a 3D node graph. The framework is reusable across
  different institutional arrangements (contract-based, government-based, etc.).
  """

  @jiaolong_nodes [
    # Central cluster: Jiaolong Co. and Huang
    %{
      id: "jiaolong_co",
      name: "Jiaolong Co.",
      type: "organization",
      x: 0,
      y: 0,
      z: 0,
      value: 90,
      tags: ["central_contractor"],
      energy: 400
    },
    %{
      id: "huang",
      name: "Yujiao Huang",
      type: "actor",
      x: -10,
      y: -10,
      z: 10,
      value: 70,
      tags: ["entrepreneur"],
      energy: 300
    },

    # Government cluster
    %{
      id: "shuangliu_gov",
      name: "Shuangliu Government",
      type: "organization",
      x: -60,
      y: 30,
      z: -20,
      value: 80,
      tags: ["government"],
      energy: 350
    },
    %{
      id: "investment_contract",
      name: "Investment Contract (2003)",
      type: "contract",
      x: -30,
      y: 20,
      z: -10,
      value: 60,
      tags: ["foundational"],
      energy: 100
    },
    %{
      id: "planning_rights",
      name: "Planning Rights",
      type: "property_right",
      x: -40,
      y: 10,
      z: -30,
      value: 55,
      tags: ["delegated"],
      energy: 150
    },
    %{
      id: "tax_sharing",
      name: "Tax Sharing (25%)",
      type: "contract",
      x: -20,
      y: 40,
      z: 0,
      value: 65,
      tags: ["incentive"],
      energy: 200
    },

    # Firms cluster
    %{
      id: "business_firms",
      name: "Business Firms (1,096)",
      type: "actor",
      x: 50,
      y: 0,
      z: 20,
      value: 75,
      tags: ["tenants"],
      energy: 250
    },
    %{
      id: "plant_rental",
      name: "Plant Rental Contracts",
      type: "contract",
      x: 30,
      y: -10,
      z: 15,
      value: 45,
      tags: ["3_year_term"],
      energy: 80
    },
    %{
      id: "office_rental",
      name: "Office Rental Contracts",
      type: "contract",
      x: 40,
      y: 10,
      z: 30,
      value: 45,
      tags: ["40_year_term"],
      energy: 80
    },

    # Residents cluster
    %{
      id: "apartment_tenants",
      name: "Residents (~100,000)",
      type: "actor",
      x: 20,
      y: -40,
      z: -20,
      value: 70,
      tags: ["population"],
      energy: 200
    },
    %{
      id: "apartment_rental",
      name: "Apartment Rental Contracts",
      type: "contract",
      x: 10,
      y: -25,
      z: -10,
      value: 45,
      tags: ["60_year_term"],
      energy: 80
    },

    # Land cluster
    %{
      id: "farmers",
      name: "Farmers / Collectives",
      type: "actor",
      x: -50,
      y: -30,
      z: 20,
      value: 60,
      tags: ["landowners"],
      energy: 150
    },
    %{
      id: "land_rental",
      name: "Land Rental (55-year)",
      type: "contract",
      x: -25,
      y: -20,
      z: 15,
      value: 50,
      tags: ["collective_land"],
      energy: 90
    },

    # Infrastructure
    %{
      id: "infrastructure",
      name: "Infrastructure (4B yuan)",
      type: "infrastructure",
      x: -10,
      y: 20,
      z: 30,
      value: 80,
      tags: ["roads", "utilities"],
      energy: 350
    },

    # Outputs
    %{
      id: "tax_revenue",
      name: "Tax Revenue (0.43B yuan)",
      type: "revenue",
      x: 30,
      y: 30,
      z: 10,
      value: 65,
      tags: ["annual"],
      energy: 200
    },
    %{
      id: "production_value",
      name: "Production (20B yuan)",
      type: "revenue",
      x: 0,
      y: 50,
      z: 0,
      value: 85,
      tags: ["annual"],
      energy: 350
    },

    # Institutional context
    %{
      id: "jiaolong_community",
      name: "Jiaolong Community",
      type: "institution",
      x: -30,
      y: -40,
      z: -40,
      value: 45,
      tags: ["political_org"],
      energy: 80
    },
    %{
      id: "transaction_costs",
      name: "Transaction Costs",
      type: "externality",
      x: 60,
      y: 40,
      z: -30,
      value: 50,
      tags: ["friction"],
      energy: 120
    }
  ]

  @jiaolong_connections [
    # Investment contract relationships
    %{
      from: "shuangliu_gov",
      to: "investment_contract",
      strength: 0.9,
      type: "authority"
    },
    %{
      from: "investment_contract",
      to: "jiaolong_co",
      strength: 0.9,
      type: "contractual"
    },

    # Planning rights delegation
    %{
      from: "investment_contract",
      to: "planning_rights",
      strength: 0.8,
      type: "authority"
    },
    %{
      from: "planning_rights",
      to: "huang",
      strength: 0.85,
      type: "authority"
    },

    # Tax sharing
    %{
      from: "investment_contract",
      to: "tax_sharing",
      strength: 0.8,
      type: "contractual"
    },
    %{
      from: "tax_revenue",
      to: "tax_sharing",
      strength: 0.7,
      type: "tax_flow"
    },
    %{
      from: "tax_sharing",
      to: "jiaolong_co",
      strength: 0.75,
      type: "tax_flow"
    },
    %{
      from: "tax_sharing",
      to: "shuangliu_gov",
      strength: 0.75,
      type: "tax_flow"
    },

    # Huang drives development
    %{
      from: "huang",
      to: "jiaolong_co",
      strength: 0.95,
      type: "authority"
    },
    %{
      from: "huang",
      to: "infrastructure",
      strength: 0.8,
      type: "incentive"
    },

    # Infrastructure investment
    %{
      from: "jiaolong_co",
      to: "infrastructure",
      strength: 0.85,
      type: "contractual"
    },
    %{
      from: "infrastructure",
      to: "business_firms",
      strength: 0.7,
      type: "incentive"
    },
    %{
      from: "infrastructure",
      to: "apartment_tenants",
      strength: 0.6,
      type: "incentive"
    },

    # Firm rental contracts
    %{
      from: "jiaolong_co",
      to: "plant_rental",
      strength: 0.8,
      type: "contractual"
    },
    %{
      from: "plant_rental",
      to: "business_firms",
      strength: 0.8,
      type: "contractual"
    },
    %{
      from: "jiaolong_co",
      to: "office_rental",
      strength: 0.8,
      type: "contractual"
    },
    %{
      from: "office_rental",
      to: "business_firms",
      strength: 0.7,
      type: "contractual"
    },

    # Apartment rental
    %{
      from: "jiaolong_co",
      to: "apartment_rental",
      strength: 0.75,
      type: "contractual"
    },
    %{
      from: "apartment_rental",
      to: "apartment_tenants",
      strength: 0.75,
      type: "contractual"
    },

    # Land acquisition
    %{
      from: "farmers",
      to: "land_rental",
      strength: 0.7,
      type: "contractual"
    },
    %{
      from: "land_rental",
      to: "jiaolong_co",
      strength: 0.7,
      type: "contractual"
    },

    # Revenue generation
    %{
      from: "business_firms",
      to: "tax_revenue",
      strength: 0.8,
      type: "tax_flow"
    },
    %{
      from: "business_firms",
      to: "production_value",
      strength: 0.85,
      type: "rent_flow"
    },

    # Community and government services
    %{
      from: "shuangliu_gov",
      to: "jiaolong_community",
      strength: 0.5,
      type: "authority"
    },
    %{
      from: "jiaolong_community",
      to: "apartment_tenants",
      strength: 0.4,
      type: "contractual"
    },

    # Transaction costs as friction
    %{
      from: "transaction_costs",
      to: "jiaolong_co",
      strength: 0.5,
      type: "externality_link"
    }
  ]

  @jiaolong_feedback_loops [
    %{
      id: "tax_investment_loop",
      name: "Tax-Investment Virtuous Cycle",
      description:
        "Higher tax sharing motivates more infrastructure investment, " <>
          "attracting more firms, generating more tax revenue. " <>
          "Similar to share tenancy (Cheung 1969).",
      nodes: ["tax_sharing", "jiaolong_co", "infrastructure", "business_firms", "tax_revenue"],
      type: :reinforcing
    },
    %{
      id: "planning_density_loop",
      name: "Planning-Density Optimization",
      description:
        "Delegated planning rights enable Huang's entrepreneurial vision, " <>
          "leading to efficient land use and infrastructure, attracting residents, " <>
          "increasing production value.",
      nodes: [
        "planning_rights",
        "huang",
        "infrastructure",
        "apartment_tenants",
        "production_value"
      ],
      type: :reinforcing
    }
  ]

  @jiaolong_annotations %{
    # Actors
    "jiaolong_co" =>
      "Founded by Yujiao Huang. Rented 4.36 km\u00B2 of farmland from farmers, " <>
        "built an industrial park, and upgraded it into an urbanized city. " <>
        "By 2014: 1,096 firms, ~100,000 residents, 20B yuan annual production. " <>
        "Jiaolong Co. is the central contractor of a web of contracts.",
    "huang" =>
      "Entrepreneur from Chongqing who founded Jiaolong Co. " <>
        "Previously ran small businesses including a slaughterhouse. " <>
        "His business vision and contract innovation drive Jiaolong's development. " <>
        "Built the first five-star movie theater and modern shopping mall in Shuangliu County.",
    "shuangliu_gov" =>
      "County government that signed the 2003 investment contract with Jiaolong Co. " <>
        "Authorized planning rights and tax sharing in exchange for development targets. " <>
        "Set up a leading group to provide coordination services.",
    "farmers" =>
      "Farmers from eight villages of Jiujiang and Dongsheng Town. " <>
        "Assigned land contract rights to village collectives, which then signed " <>
        "55-year land rental contracts with Jiaolong Co. " <>
        "Compensation rose over time as development created spillover value.",
    "business_firms" =>
      "1,096 firms by 2014: 580 in manufacturing, 499 in distribution/services, " <>
        "7 in finance, 8 in education/training. " <>
        "Firms must register in Shuangliu and pay taxes locally. " <>
        "Tax incentives include tuition coverage for employees' children.",
    "apartment_tenants" =>
      "Around 100,000 people residing in the city by 2014, " <>
        "population density 25,000 per km\u00B2 " <>
        "(vs 7,000 for Shuangliu County overall). " <>
        "Active sublease market with 5% transfer fee.",
    "jiaolong_community" =>
      "Political organization for 4,013 indigenous residents from eight villages. " <>
        "Provides public services: policy communication, birth control, social security. " <>
        "Does not hold collective assets \u2014 economic and political rights are separated.",

    # Contracts
    "investment_contract" =>
      "The foundational 2003 contract between Jiaolong Co. and Shuangliu Government. " <>
        "Jiaolong must invest 1B yuan, accommodate 400+ firms, achieve 0.3B yuan annual tax. " <>
        "In return: planning rights, 25% tax sharing, and government coordination services.",
    "tax_sharing" =>
      "Shuangliu rewards Jiaolong with 25% of tax revenues " <>
        "if the promised tax rate of 100 yuan/m\u00B2 is realized; " <>
        "20% if 80 yuan/m\u00B2 is achieved. " <>
        "This is the key incentive mechanism \u2014 similar to share tenancy (Cheung 1969). " <>
        "Firms also share in tax reimbursements, creating a multi-level incentive chain.",
    "planning_rights" =>
      "Most Chinese city governments dominate planning. " <>
        "Jiaolong acquired planning rights through the investment contract, " <>
        "enabling Huang to allocate land among uses according to price signals. " <>
        "The efficient allocation of planning rights requires visionary entrepreneurs (Hayek 1945).",
    "plant_rental" =>
      "3-year term. Deposit: 40 yuan/m\u00B2. Monthly rent: 15 yuan/m\u00B2. " <>
        "Includes a tax target clause: firms pay extra if yearly tax " <>
        "falls below 15,000 yuan per 1,000 m\u00B2 of construction area.",
    "office_rental" =>
      "40-year term (default renewal every 20 years per Contract Law Article 214). " <>
        "Deposit: 4,286 yuan/m\u00B2. Monthly rent: 3 yuan/m\u00B2. " <>
        "Includes 50% tax reimbursement for firms exceeding 10,000 yuan tax per 100 m\u00B2.",
    "apartment_rental" =>
      "60-year term (renewed twice under the 20-year Contract Law limit). " <>
        "Deposit: 2,653 yuan/m\u00B2. Monthly rent: 0.5 yuan/m\u00B2. " <>
        "High deposit substitutes for a sale under legal constraints on collective land transfer. " <>
        "50% deposit penalty for early withdrawal.",
    "land_rental" =>
      "55-year lease. Rent: price of 1,200 jin rice (5% increase every 3 years). " <>
        "Farmers assigned rights to village collectives, which contracted with Jiaolong. " <>
        "Sequential development strategy: earlier contracts at lower prices, " <>
        "later ones rose as worker rental demand created spillover value.",

    # Infrastructure and outputs
    "infrastructure" =>
      "Over 4B yuan in infrastructure investment by 2014. " <>
        "Includes sewage treatment plant, 6,000-ton water plant, 10,000 kvA switch plant, " <>
        "pipe networks, 30-meter roads, 10 kv power station, underground cables. " <>
        "Total investment including commercial buildings: over 9B yuan.",
    "tax_revenue" =>
      "0.43B yuan annual tax revenue by 2014. " <>
        "Firms registered in Shuangliu pay local taxes. " <>
        "Tax revenue is shared between Shuangliu Government (75%) and Jiaolong Co. (25%). " <>
        "This sharing arrangement motivates all parties to maximize total rent above land.",
    "production_value" =>
      "20B yuan (3B USD) annual production value by 2014. " <>
        "Achieved on just 4.36 km\u00B2 \u2014 " <>
        "a more efficient allocation of resources by per-area production " <>
        "compared to most other cities in China.",

    # Institutional context
    "transaction_costs" =>
      "The central thesis: urbanization involves a large volume of contracts " <>
        "that produce high transaction costs. " <>
        "Jiaolong reduces these costs by being the central contractor \u2014 " <>
        "substituting one contract for a series of bilateral negotiations. " <>
        "But costs rise as the contractual web grows more complex, " <>
        "testing Huang's ability to innovate."
  }

  @jiaolong_theory [
    %{
      title: "The Coase Framework",
      body:
        "Coase (1960) proposed that externality is due to high transaction costs " <>
          "in defining and contracting property rights. " <>
          "If property rights are clearly defined and contracting costs sufficiently low, " <>
          "property rights can be exchanged and redefined, and externality is eliminated."
    },
    %{
      title: "Contract vs Coercion",
      body:
        "Government reduces transaction costs through coercion \u2014 " <>
          "land taking, mandatory planning, fiat coordination. " <>
          "Jiaolong achieves the same through a web of voluntary contracts: " <>
          "tax sharing, rental agreements, and delegated planning rights. " <>
          "Two different institutional mechanisms for the same problem."
    },
    %{
      title: "The Central Contractor",
      body:
        "Jiaolong Co. reduces coordination costs by being a central contractor. " <>
          "Instead of thousands of bilateral negotiations between farmers, firms, " <>
          "and residents, Jiaolong signs a series of standard contracts " <>
          "that substitute for the full web of relationships."
    },
    %{
      title: "Share Tenancy and Tax Sharing",
      body:
        "Cheung (1969) studied how share tenancy aligns landlord and tenant incentives. " <>
          "Jiaolong's tax sharing contracts work similarly: " <>
          "government, Jiaolong, and firms all share the benefit of urbanization, " <>
          "motivating each party to maximize the total rent above land."
    },
    %{
      title: "Planning Rights as Property Rights",
      body:
        "Planning defines land use rights. Who holds planning rights " <>
          "and how land use rights are redefined are essential for efficient allocation. " <>
          "Hayek (1945): the efficient allocation of planning rights " <>
          "requires the participation of visionary people who can use dispersed knowledge."
    },
    %{
      title: "Institutional Constraints",
      body:
        "China's Land Administration Law forbids transfer of collective land use rights " <>
          "to outsiders. This forces Jiaolong to use rental contracts instead of sales. " <>
          "Tax sharing contracts are not protected by law \u2014 default risk is high. " <>
          "Institutional changes in law would shift the balance toward more contract-based cities."
    }
  ]

  @models %{
    "jiaolong" => %{
      id: "jiaolong",
      name: "Jiaolong: Contract-Based City",
      subtitle: "Shuangliu County, Chengdu, China (2004\u20132014)",
      source: "Lu, Q. (2016). The Contractual Nature of the City. Man and the Economy, 3(1), 129\u2013145.",
      description:
        "A city built and operated by a private corporation through voluntary contracts " <>
          "rather than government coercion. Jiaolong Co. became the central contractor " <>
          "of a web of tax sharing, rental, and land agreements that internalized " <>
          "externalities and reduced transaction costs.",
      category: "institutional"
    }
  }

  def list_models do
    Enum.map(@models, fn {_id, model} ->
      Map.take(model, [:id, :name, :subtitle, :category])
    end)
  end

  def get_model(model_id) do
    Map.get(@models, model_id)
  end

  def generate("jiaolong") do
    %{nodes: @jiaolong_nodes, connections: @jiaolong_connections}
  end

  def generate(_model_id), do: %{nodes: [], connections: []}

  def feedback_loops("jiaolong"), do: @jiaolong_feedback_loops
  def feedback_loops(_), do: []

  def annotation("jiaolong", entity_id) do
    Map.get(@jiaolong_annotations, entity_id)
  end

  def annotation(_, _), do: nil

  def annotations("jiaolong"), do: @jiaolong_annotations
  def annotations(_), do: %{}

  def theory("jiaolong"), do: @jiaolong_theory
  def theory(_), do: []

  def actors("jiaolong") do
    Enum.filter(@jiaolong_nodes, fn node ->
      node.type in ["actor", "organization", "institution"]
    end)
  end

  def actors(_), do: []

  def contracts("jiaolong") do
    Enum.filter(@jiaolong_nodes, fn node ->
      node.type in ["contract", "property_right"]
    end)
  end

  def contracts(_), do: []
end
