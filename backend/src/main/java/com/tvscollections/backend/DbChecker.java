package com.tvscollections.backend;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class DbChecker {
    public static void main(String[] args) {
        String url = "jdbc:mysql://192.168.114.167:3308/tvs_collections?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Kolkata";
        String user = "root";
        String password = "saibaba";

        System.out.println("Connecting to database: " + url);
        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {
            
            System.out.println("Connected successfully!");

            // 1. Total count
            try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM hit_call_logs")) {
                if (rs.next()) {
                    System.out.println("Total Hit Call Logs count: " + rs.getInt(1));
                }
            }

            // 2. Count by date
            System.out.println("\nHit Call Logs count by observed date:");
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT DATE(observed_at) as d, COUNT(*) as c FROM hit_call_logs GROUP BY DATE(observed_at) ORDER BY d DESC LIMIT 10")) {
                while (rs.next()) {
                    System.out.println("Date: " + rs.getString("d") + " | Count: " + rs.getInt("c"));
                }
            }

            // 3. Latest 20 records
            System.out.println("\nLatest 20 Hit Call Logs:");
            try (ResultSet rs = stmt.executeQuery(
                    "SELECT id, observed_at, created_at, campaign_id, caller, call_id, selected_agent_user, agent_id FROM hit_call_logs ORDER BY id DESC LIMIT 20")) {
                while (rs.next()) {
                    System.out.printf("ID: %d | ObservedAt: %s | CreatedAt: %s | Campaign: %s | Caller: %s | CallID: %s | AgentUser: %s | AgentID: %s\n",
                            rs.getLong("id"),
                            rs.getString("observed_at"),
                            rs.getString("created_at"),
                            rs.getString("campaign_id"),
                            rs.getString("caller"),
                            rs.getString("call_id"),
                            rs.getString("selected_agent_user"),
                            rs.getString("agent_id"));
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
