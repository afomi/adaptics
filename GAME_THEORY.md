# Game Theory Overview

## Basic
- Studies strategic decision-making when outcomes depend on multiple agents' choices.
- Core terms: players, strategies, payoffs, information (complete vs. incomplete), and equilibrium.
- Nash equilibrium: a profile where no player gains by deviating unilaterally.
- Classic examples: Prisoner’s Dilemma, Coordination Game, Battle of the Sexes.
- Solution tools: payoff matrices, best-response analysis, dominance, mixed strategies for randomness.

## Intermediate
- Extensive-form games capture sequence, timing, and information sets; solved via backward induction or subgame-perfect equilibrium.
- Repeated games (finite and infinite) introduce history-dependent strategies (e.g., tit-for-tat) and enable cooperation through threats and rewards.
- Bayesian games handle private information using beliefs and expected utilities, leading to Bayesian Nash equilibrium.
- Evolutionary game theory studies population dynamics; strategies evolve according to fitness (replicator dynamics, ESS).
- Mechanism design works backward from desired outcomes to build rules that align incentives (incentive compatibility, individual rationality).

## Advanced
- Stochastic and differential games model dynamics under uncertainty and continuous time; solutions involve Bellman equations and Hamilton–Jacobi–Bellman PDEs.
- Learning in games covers no-regret algorithms and reinforcement learning approaches that converge (or cycle) toward equilibria.
- Mean-field games approximate large populations via representative-agent models with consistency conditions across agents.
- Correlated equilibrium generalizes Nash by allowing coordination via signals; implementable through mediators or public randomization.
- Algorithmic game theory studies computational complexity of equilibria, auction design, and efficiency metrics (price of anarchy/stability).

## Simulation and Research Approaches
- Analytical modeling: derive equilibria symbolically (normal/extensive form) and compare welfare, efficiency, or robustness.
- Computational search: use linear/quadratic programming, homotopy methods, or Lemke–Howson for Nash; support enumeration and global optimization for mixed strategies.
- Agent-based simulation: implement heterogeneous agents with bounded rationality, adaptive strategies, and noise to observe emergent behavior.
- Reinforcement learning experiments: train agents (Q-learning, policy gradients, MARL) in repeated or stochastic games to study convergence, exploitation, and equilibrium selection.
- Evolutionary simulations: run replicator dynamics, genetic algorithms, or Moran processes to examine stability and fixation probabilities.
- Experimental economics: design lab/online experiments with human subjects to test theories, estimate parameters (risk aversion, reciprocity), and validate equilibrium predictions.
- Empirical data analysis: fit structural models to real-world strategic settings (auctions, pricing, bargaining) using econometric or causal inference tools.

### Detail: RL Experiments
- Setup: define stage game and observation model; choose reward shaping or baseline to stabilize learning; include exploration schedules and opponent pools (self-play, population play, fixed bots).
- Methods: Q-learning/Deep Q for tabular vs. high-dimensional states; policy gradients/actor-critic for continuous actions; MARL variants like independent learners, centralized training with decentralized execution, or opponent modeling.
- Metrics: convergence speed, exploitability (best response gap), equilibrium selection patterns, cycle detection, and transfer across opponents.
- Findings: self-play can converge to equilibria (e.g., zero-sum) but may cycle in general-sum games; curriculum, noise, or regularization steers toward specific equilibria; meta-strategies help avoid overfitting to a narrow opponent set.

### Methods: RL Algorithms in Games
- Q-learning/Deep Q: off-policy value learning; tabular Q works for small state/action spaces; Deep Q Networks (experience replay, target networks) scale to large spaces; Double/Distributional/Rainbow variants improve stability and exploration.
- Policy gradients & actor-critic: directly optimize stochastic policies; suited to continuous or large action spaces; actor-critic reduces variance via value baselines; PPO/SAC/DDPG/TD3 balance exploration vs. stability for continuous control games.
- Multi-agent RL variants:
  - Independent learners: each agent treats others as part of the environment; simple but faces non-stationarity.
  - Centralized training, decentralized execution (CTDE): critics or value baselines see joint observations/actions during training (e.g., MADDPG, QMIX), but policies act on local info at test time.
  - Opponent modeling: explicit belief/embedding of opponents (e.g., fictitious self-play, LOLA, meta-policy gradients) to anticipate adaptations and reduce exploitability.

### Q-learning/Deep Q by Level
- Beginning: learn a table `Q(s, a)` that estimates future reward when taking action `a` in state `s`; update rule nudges estimates toward observed reward plus discounted best future value; uses epsilon-greedy exploration to try new actions; works when states/actions are small and observable.
- Intermediate: replace the table with a neural network for large/continuous state spaces (DQN); stabilize learning with experience replay buffers and target networks; variants like Double DQN reduce overestimation, prioritized replay improves sample use, dueling networks separate state vs. advantage value; apply careful reward scaling, gradient clipping, and exploration schedules to avoid divergence. 

### Detail: Evolutionary Simulations
- Setup: specify strategy set (pure, mixed, or parameterized), fitness mapping to payoffs, population size/structure (well-mixed vs. graph), and update rule.
- Dynamics: replicator equations for continuous-time limits; discrete replicator or Moran processes for stochastic updates; genetic algorithms evolve strategies via selection, crossover, mutation.
- Metrics: evolutionarily stable strategies, fixation probabilities/times, diversity over time, basin of attraction, and sensitivity to mutation rates.
- Findings: spatial or network structure can sustain cooperation; small mutations can move populations between equilibria; stochastic effects in finite populations can overturn deterministic ESS predictions. 
