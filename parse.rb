require 'csv'
require 'digest'
require 'json'
require 'pry'

rows = CSV.parse(File.read("ivn.csv"), headers: true)

# Goal:

# To create Node & Link objects from the normalized ivn.csv data

# The ivn.csv has the following headers:
#
# ["EnablingSource", 0
#  "EnablingComponent", 1
#  "EnablingComponent Description", 2
#  "Dependent Component", 3
#  "Dependent Component Description", 4
#  "Dependent Source", 5
#  "Enabling Source URL", 6
#  "Dependent Source URL"] 7
#


# Digest strings to keys, for consistency & repeatability
def digest(string)
  Digest::SHA256.hexdigest(string)
end


sources = rows.collect { |row|
  {
    name: row.fields[0], # Enabling Source
    description: row.fields[6], # Enabling SourceURL
    hash: digest(row.fields[0])
  }
}

components = rows.collect { |row|
  {
    name: row.fields[1], # EnablingComponent
    description: row.fields[2], # EnablingComponent Description
    hash: digest(row.fields[1])
  }
}

dependent_components = rows.collect { |row|
  {
    name: row.fields[3], # Dependent Component
    description: row.fields[4], # Dependent Component Description
    hash: digest(row.fields[3])
  }
}

dependent_sources = rows.collect { |row|
  {
    name: row.fields[5], # Dependent Source
    description: row.fields[6], # Dependent Component URL
    hash: digest(row.fields[5])
  }
}

sources.concat(dependent_sources)
unique_sources = sources.uniq! {|e| e[:hash] }

components.concat(dependent_components)
unique_components = components.uniq! {|e| e[:hash] }

unique_source_names = sources.collect { |source| source[:name] }.uniq # A text list of unique source names
unique_component_names = components.collect { |i| i[:name] }.uniq # A text list of unique component names

# sources.uniq! # A text list of unique sources
# components.uniq! # A text list of unique components

#
# 2b. Links ###################################################################
#
# EnablingSource,EnablingComponent
# EnablingComponent,Dependent Component
# Dependent Component,Dependent Source

links = rows.collect { |row|
  {
    from_hash: digest(row.fields[0]),
    to_hash: digest(row.fields[1])
  }
}

component_links = rows.collect { |row|
  {
    from_hash: digest(row.fields[1]),
    to_hash: digest(row.fields[3])
  }
}

source_components_2 = rows.collect { |row|
  {
    from_hash: digest(row.fields[3]),
    to_hash: digest(row.fields[5])
  }
}

links.concat(component_links)
links.concat(source_components_2)

#
# 3. Write the data ###########################################################
#

File.open("unique_sources.json", "w") do |f|
  f << sources.to_json
end
File.open("unique_components.json", "w") do |f|
  f << components.to_json
end

File.open("ivn_links.json", "w") do |f|
  f << links.to_json
end

# * got unique hashed sources
# * got unique hashed components
# * got 3 sets of links per record

puts "Wrote unique_sources.json,unique_components.json, and ivn_links.json successfully"
