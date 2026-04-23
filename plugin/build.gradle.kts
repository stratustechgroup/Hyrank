plugins {
    java
    `java-library`
    id("com.github.johnrengelman.shadow") version "8.1.1" apply false
}

group = "gg.hyrank"
version = "0.1.0"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    // Jakarta Servlet API (provided at runtime by the Hytale server)
    compileOnly("jakarta.servlet:jakarta.servlet-api:6.0.0")

    // JSON (de)serialisation
    implementation("com.fasterxml.jackson.core:jackson-databind:2.17.1")

    // Bouncy Castle for Votifier V2 RSA
    implementation("org.bouncycastle:bcprov-jdk18on:1.78.1")

    // JUnit 5 for tests
    testImplementation(platform("org.junit:junit-bom:5.10.3"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")

    // Mockito for mocking servlet objects in tests
    testImplementation("org.mockito:mockito-core:5.11.0")
}

tasks.test {
    useJUnitPlatform()
    maxParallelForks = Runtime.getRuntime().availableProcessors()
}

tasks.jar {
    archiveFileName = "hyrank-vote-plugin-${version}.jar"
    manifest {
        attributes(
            "Implementation-Title" to "HyRank Vote Plugin",
            "Implementation-Version" to version,
            "Main-Class" to "gg.hyrank.vote.HyRankPlugin"
        )
    }
}
